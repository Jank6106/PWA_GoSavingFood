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
    const orderCode = searchParams.get('orderCode');

    if (!orderCode) {
      return NextResponse.json(
        { success: false, error: 'orderCode is required' },
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
      return NextResponse.json(
        { success: false, error: payosData.desc || 'PayOS Error' },
        { status: 400, headers: corsHeaders }
      );
    }

    const isPaid = payosData.data?.status === 'PAID';

    // Nếu PayOS xác nhận đã thanh toán -> tự động cập nhật Database Supabase
    if (isPaid) {
      const supabaseUrl = process.env.SUPABASE_URL;
      const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

      if (supabaseUrl && serviceRoleKey) {
        const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);
        await supabaseAdmin.rpc('confirm_payos_payment', {
          p_order_code: Number(orderCode),
          p_payment_link_id: payosData.data?.id || null,
        });
      }
    }

    return NextResponse.json(
      {
        success: true,
        paid: isPaid,
        status: payosData.data?.status,
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
