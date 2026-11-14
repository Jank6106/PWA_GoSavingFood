import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

// GET: Kiểm tra kết nối webhook (cho PayOS hoặc health check)
export async function GET() {
  return NextResponse.json({
    status: 'online',
    message: 'PayOS Webhook Endpoint is ready',
    timestamp: new Date().toISOString(),
  });
}

function verifySignature(data: Record<string, unknown>, signature: string, checksumKey: string): boolean {
  try {
    const sortedKeys = Object.keys(data).sort();
    const signData = sortedKeys
      .map((k) => {
        const val = data[k];
        if (val === null || val === undefined) return `${k}=`;
        return `${k}=${String(val)}`;
      })
      .join('&');

    const expectedSignature = crypto
      .createHmac('sha256', checksumKey)
      .update(signData)
      .digest('hex');

    return crypto.timingSafeEqual(
      Buffer.from(signature, 'hex'),
      Buffer.from(expectedSignature, 'hex')
    );
  } catch (err) {
    console.error('[PayOS Webhook] verifySignature error:', err);
    return false;
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const checksumKey = process.env.PAYOS_CHECKSUM_KEY;
    if (!checksumKey) {
      console.error('[PayOS Webhook] Missing PAYOS_CHECKSUM_KEY in environment');
      return NextResponse.json({ success: false, error: 'Server misconfigured' }, { status: 500 });
    }

    // Trường hợp PayOS gửi test webhook xác thực URL
    if (body.test || !body.data) {
      console.log('[PayOS Webhook] Ping/Test request received successfully');
      return NextResponse.json({ success: true, message: 'Webhook test received' });
    }

    const { data, signature } = body;

    // Xác thực chữ ký số chống giả mạo
    const isValid = verifySignature(data, signature, checksumKey);
    if (!isValid) {
      console.warn('[PayOS Webhook] Invalid signature rejected!');
      return NextResponse.json({ success: false, error: 'Invalid signature' }, { status: 400 });
    }

    const orderCode = data.orderCode;
    const paymentLinkId = data.paymentLinkId;

    if (data.code !== '00') {
      return NextResponse.json({ success: true, message: 'Non-payment event ignored' });
    }

    if (!orderCode) {
      return NextResponse.json({ success: false, error: 'Missing orderCode' }, { status: 400 });
    }

    // Cập nhật trạng thái đơn hàng thành công trong Supabase
    const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      console.error('[PayOS Webhook] Missing Supabase admin credentials');
      return NextResponse.json({ success: false, error: 'Database credentials missing' }, { status: 500 });
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    const { data: order, error: orderError } = await supabaseAdmin.from('orders')
      .select('final_amount').eq('payment_order_code', orderCode).single();
    if (orderError || !order || Number(data.amount) !== Number(order.final_amount)) {
      return NextResponse.json({ success: false, error: 'Unknown order or payment amount mismatch' }, { status: 400 });
    }

    // Gọi hàm RPC confirm_payos_payment đã tạo ở migration 0015
    const { data: rpcRes, error: rpcErr } = await supabaseAdmin.rpc('confirm_payos_payment', {
      p_order_code: orderCode,
      p_payment_link_id: paymentLinkId || null,
    });

    if (rpcErr || !rpcRes?.success) {
      console.error('[PayOS Webhook] confirm_payos_payment RPC error:', rpcErr);
      return NextResponse.json({ success: false, error: 'Payment confirmation failed' }, { status: 500 });
    }

    console.log('[PayOS Webhook] Successfully confirmed payment for orderCode:', orderCode, rpcRes);

    return NextResponse.json({
      success: true,
      result: rpcRes,
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown error';
    console.error('[PayOS Webhook] Error processing webhook:', err);
    return NextResponse.json({ success: false, error: errorMsg }, { status: 500 });
  }
}
