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

export async function GET() {
  return handleCleanup();
}

export async function POST() {
  return handleCleanup();
}

async function handleCleanup() {
  try {
    const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json(
        { success: false, error: 'Supabase credentials missing' },
        { status: 500, headers: corsHeaders }
      );
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    // 1. Dọn dẹp các đơn hết hạn trong database
    const { data: rpcRes, error: rpcErr } = await supabaseAdmin.rpc('cleanup_expired_pending_orders');

    if (rpcErr) {
      console.error('[Cleanup Expired] RPC error:', rpcErr);
      return NextResponse.json(
        { success: false, error: rpcErr.message },
        { status: 500, headers: corsHeaders }
      );
    }

    const expiredCodes: number[] = rpcRes?.expired_order_codes || [];
    let cancelledPayOSCount = 0;

    // 2. Với các đơn hết hạn có payment_order_code, chủ động gọi PayOS để hủy link
    const clientId = process.env.PAYOS_CLIENT_ID;
    const apiKey = process.env.PAYOS_API_KEY;

    if (clientId && apiKey && Array.isArray(expiredCodes) && expiredCodes.length > 0) {
      await Promise.allSettled(
        expiredCodes.map(async (code) => {
          try {
            const res = await fetch(
              `https://api-merchant.payos.vn/v2/payment-requests/${code}/cancel`,
              {
                method: 'POST',
                headers: {
                  'x-client-id': clientId,
                  'x-api-key': apiKey,
                  'Content-Type': 'application/json',
                  'User-Agent': 'GoSavingFood/1.0',
                },
                body: JSON.stringify({
                  cancellationReason: 'Hết thời hạn thanh toán (TTL 30 phút + 3 phút đệm)',
                }),
              }
            );
            const data = await res.json();
            if (data.code === '00') {
              cancelledPayOSCount++;
            }
          } catch (cancelErr) {
            console.warn(`[Cleanup Expired] Cancel PayOS link failed for code ${code}:`, cancelErr);
          }
        })
      );
    }

    return NextResponse.json(
      {
        success: true,
        expiredCount: rpcRes?.expired_orders_count || 0,
        cancelledPayOSCount,
      },
      { headers: corsHeaders }
    );
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown error';
    console.error('[Cleanup Expired] Error:', err);
    return NextResponse.json(
      { success: false, error: errorMsg },
      { status: 500, headers: corsHeaders }
    );
  }
}
