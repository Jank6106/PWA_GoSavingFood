import { NextResponse } from 'next/server';
import { corsHeaders, isSettled, paymentDB, reconcilePayment } from '../payment';
export async function OPTIONS() { return NextResponse.json({}, { headers: corsHeaders }); }
export async function GET(request: Request) {
  try {
    const params = new URL(request.url).searchParams;
    const id = params.get('orderId');
    const code = params.get('orderCode');
    if (!id && (!code || !Number.isSafeInteger(Number(code)) || Number(code) <= 0)) {
      return NextResponse.json({ success: false, error: 'Invalid order reference' }, { status: 400, headers: corsHeaders });
    }
    const db = paymentDB();
    const query = db.from('orders').select('*');
    const { data: order, error } = await (id ? query.eq('id', id) : query.eq('payment_order_code', code)).single();
    if (error || !order) throw new Error('Order not found');
    if (isSettled(order)) return NextResponse.json({ success: true, paid: true, status: 'PAID', updated: true }, { headers: corsHeaders });
    if (order.payment_order_code) await reconcilePayment(order);
    const { data: latest, error: readError } = await db.from('orders').select('status,payment_status').eq('id', order.id).single();
    if (readError) throw readError;
    const paid = isSettled(latest);
    return NextResponse.json({ success: true, paid, updated: paid,
      status: paid ? 'PAID' : latest.payment_status === 'refund_pending' ? 'REFUND_PENDING' : latest.status.toUpperCase(),
    }, { headers: corsHeaders });
  } catch {
    return NextResponse.json({ success: false, paid: false, updated: false, error: 'Không thể đối soát thanh toán.' }, { status: 503, headers: corsHeaders });
  }
}
