import { createClient } from '@supabase/supabase-js';
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization', 'Cache-Control': 'no-store',
};
export function paymentDB() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Database credentials missing');
  return createClient(url, key);
}
export async function payosRequest(code: string, body?: object) {
  const clientId = process.env.PAYOS_CLIENT_ID;
  const apiKey = process.env.PAYOS_API_KEY;
  if (!clientId || !apiKey) throw new Error('PayOS credentials missing');
  const response = await fetch('https://api-merchant.payos.vn/v2/payment-requests' + code, {
    method: body ? 'POST' : 'GET',
    headers: { 'x-client-id': clientId, 'x-api-key': apiKey, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined, cache: 'no-store',
    signal: AbortSignal.timeout(15000),
  });
  const result = await response.json();
  if (!response.ok || result.code !== '00') throw new Error('Không thể đối soát thanh toán. Vui lòng thử lại.');
  return result.data;
}
export function isSettled(order: { payment_status: string; status: string }) {
  return order.payment_status === 'success' ||
    ['paid', 'preparing', 'ready_for_pickup', 'completed', 'picked_up'].includes(order.status);
}
export async function reconcilePayment(order: { payment_order_code: number; final_amount: number }) {
  const remote = await payosRequest('/' + order.payment_order_code);
  if (remote.status === 'PAID') {
    if (Number(remote.amount) !== Number(order.final_amount) ||
        Number(remote.amountPaid) < Number(order.final_amount)) throw new Error('Payment amount mismatch');
    const { data, error } = await paymentDB().rpc('confirm_payos_payment', {
      p_order_code: order.payment_order_code, p_payment_link_id: remote.id || null,
    });
    if (error || !data?.success) throw new Error('Payment confirmation could not be saved');
  }
  return remote;
}
