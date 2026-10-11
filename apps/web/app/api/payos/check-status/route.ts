import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    let orderCode = searchParams.get('orderCode');
    const orderId = searchParams.get('orderId');

    const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabaseAdmin = supabaseUrl && serviceRoleKey ? createClient(supabaseUrl, serviceRoleKey) : null;

    // Self-healing: Nếu thiếu orderCode nhưng có orderId, tra cứu trong DB trước
    if (!orderCode && orderId && supabaseAdmin) {
      const { data: existingOrder } = await supabaseAdmin
        .from('orders')
        .select('payment_order_code, payment_status, status')
        .eq('id', orderId)
        .maybeSingle();

      if (existingOrder?.payment_order_code) {
        orderCode = String(existingOrder.payment_order_code);
      } else if (
        existingOrder &&
        (existingOrder.payment_status === 'success' ||
          existingOrder.status === 'paid' ||
          existingOrder.status === 'confirmed' ||
          existingOrder.status === 'completed')
      ) {
        return NextResponse.json(
          { success: true, status: 'PAID', paid: true, updated: true },
          { headers: corsHeaders }
        );
      }
    }

    if (!orderCode) {
      return NextResponse.json(
        { success: false, error: 'orderCode or orderId is required' },
        { status: 400, headers: corsHeaders }
      );
    }

    const clientId = process.env.PAYOS_CLIENT_ID;
    const apiKey = process.env.PAYOS_API_KEY;

    if (!clientId || !apiKey) {
      return NextResponse.json(
        { success: false, error: 'Server misconfigured' },
        { status: 500, headers: corsHeaders }
      );
    }

    // Gọi trực tiếp PayOS API để tra cứu trạng thái thanh toán của đơn
    const payosRes = await fetch(
      `https://api-merchant.payos.vn/v2/payment-requests/${orderCode}`,
      {
        method: 'GET',
        headers: {
          'x-client-id': clientId,
          'x-api-key': apiKey,
        },
      }
    );

    const payosData = await payosRes.json();

    if (payosData.code !== '00') {
      // Fallback: Nếu PayOS báo lỗi mã đơn nhưng Supabase đã ghi nhận thanh toán
      if (supabaseAdmin) {
        const query = supabaseAdmin.from('orders').select('payment_status, status');
        const { data: dbCheck } = orderId
          ? await query.eq('id', orderId).maybeSingle()
          : await query.eq('payment_order_code', String(orderCode)).maybeSingle();

        if (
          dbCheck &&
          (dbCheck.payment_status === 'success' ||
            dbCheck.status === 'paid' ||
            dbCheck.status === 'confirmed')
        ) {
          return NextResponse.json(
            { success: true, status: 'PAID', paid: true, updated: true },
            { headers: corsHeaders }
          );
        }
      }

      return NextResponse.json(
        { success: false, error: payosData.desc || 'PayOS Error' },
        { status: 400, headers: corsHeaders }
      );
    }

    const isPaid = payosData.data?.status === 'PAID';
    let updated = false;

    // Khi nhận được trạng thái thanh toán là PAID -> Bắt buộc cập nhật Supabase
    if (isPaid && supabaseAdmin) {
      const numCode = Number(orderCode);

      // 1. Gọi RPC confirm_payos_payment
      if (!isNaN(numCode)) {
        try {
          const { data: rpcRes, error: rpcErr } = await supabaseAdmin.rpc('confirm_payos_payment', {
            p_order_code: numCode,
            p_payment_link_id: payosData.data?.id || null,
          });

          if (!rpcErr && (rpcRes?.success || rpcRes?.message === 'ALREADY_PAID')) {
            updated = true;
          }
        } catch (rpcEx) {
          console.warn('[PayOS check-status] RPC confirm exception:', rpcEx);
        }
      }

      // 2. Self-healing fallback: Cập nhật trực tiếp nếu RPC không thành công
      if (!updated) {
        try {
          const updateBuilder = supabaseAdmin
            .from('orders')
            .update({
              payment_status: 'success',
              status: 'paid',
              payment_link_id: payosData.data?.id || null,
              updated_at: new Date().toISOString(),
            });

          const { data: updatedRows, error: updateErr } = orderId
            ? await updateBuilder.eq('id', orderId).select('id, customer_id')
            : await updateBuilder.eq('payment_order_code', String(orderCode)).select('id, customer_id');

          if (!updateErr && updatedRows && updatedRows.length > 0) {
            updated = true;
            try {
              await supabaseAdmin.from('notifications').insert({
                user_id: updatedRows[0].customer_id,
                icon: 'order',
                title: 'Thanh toán thành công 🎉',
                body: `Đơn hàng #${updatedRows[0].id} đã được xác nhận thanh toán qua VietQR.`,
                data: { orderId: updatedRows[0].id, status: 'paid' },
                is_read: false,
              });
            } catch {}
          }
        } catch (dbEx) {
          console.warn('[PayOS check-status] Direct update exception:', dbEx);
        }
      }
    }

    return NextResponse.json(
      {
        success: true,
        status: isPaid ? 'PAID' : (payosData.data?.status || 'PENDING'),
        paid: isPaid,
        updated: isPaid ? true : false,
        amount: payosData.data?.amount,
        amountPaid: payosData.data?.amountPaid,
      },
      { headers: corsHeaders }
    );
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown error';
    console.error('[PayOS check-status] error:', err);
    return NextResponse.json(
      { success: false, error: errorMsg },
      { status: 500, headers: corsHeaders }
    );
  }
}
