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

export async function POST(request: Request) {
  try {
    const body = await request.json();
    let { orderCode, orderId, cancellationReason } = body;

    const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabaseAdmin = supabaseUrl && serviceRoleKey ? createClient(supabaseUrl, serviceRoleKey) : null;

    if (!orderCode && orderId && supabaseAdmin) {
      const { data: dbOrder } = await supabaseAdmin
        .from('orders')
        .select('payment_order_code')
        .eq('id', orderId)
        .maybeSingle();

      if (dbOrder?.payment_order_code) {
        orderCode = dbOrder.payment_order_code;
      }
    }

    if (!orderCode) {
      return NextResponse.json(
        { success: false, error: 'orderCode or valid orderId is required' },
        { status: 400, headers: corsHeaders }
      );
    }

    const clientId = process.env.PAYOS_CLIENT_ID;
    const apiKey = process.env.PAYOS_API_KEY;

    if (!clientId || !apiKey) {
      return NextResponse.json(
        { success: false, error: 'PayOS server misconfigured' },
        { status: 500, headers: corsHeaders }
      );
    }

    const payosRes = await fetch(
      `https://api-merchant.payos.vn/v2/payment-requests/${orderCode}/cancel`,
      {
        method: 'POST',
        headers: {
          'x-client-id': clientId,
          'x-api-key': apiKey,
          'Content-Type': 'application/json',
          'User-Agent': 'GoSavingFood/1.0',
        },
        body: JSON.stringify({
          cancellationReason: cancellationReason || 'Hết hạn thanh toán hoặc khách hàng hủy',
        }),
      }
    );

    const payosData = await payosRes.json();

    if (payosData.code !== '00') {
      console.warn('[PayOS Cancel] cancelPaymentLink returned non-00:', payosData);
      return NextResponse.json(
        { success: false, error: payosData.desc || 'PayOS Error' },
        { status: 400, headers: corsHeaders }
      );
    }

    return NextResponse.json(
      {
        success: true,
        status: 'CANCELLED',
        data: payosData.data,
      },
      { headers: corsHeaders }
    );
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown error';
    console.error('[PayOS Cancel] error:', err);
    return NextResponse.json(
      { success: false, error: errorMsg },
      { status: 500, headers: corsHeaders }
    );
  }
}
