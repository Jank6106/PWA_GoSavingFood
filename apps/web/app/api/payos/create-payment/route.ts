import { NextResponse } from 'next/server';
import crypto from 'node:crypto';
import { corsHeaders, isSettled, paymentDB, payosRequest, reconcilePayment } from '../payment';
export async function OPTIONS() { return NextResponse.json({}, { headers: corsHeaders }); }
export async function POST(request: Request) {
  try {
    const { orderId } = await request.json();
    if (typeof orderId !== 'string' || !/^[0-9a-f-]{36}$/i.test(orderId)) {
      return NextResponse.json({ success: false, error: 'Invalid orderId' }, { status: 400, headers: corsHeaders });
    }
    const db = paymentDB();
    const { data: order, error } = await db.rpc('reserve_payos_payment', { p_order_id: orderId });
    if (error || !order) throw new Error('Không thể tải đơn hàng.');
    const settled = () => NextResponse.json({ success: true, paid: true, status: 'PAID', updated: true }, { headers: corsHeaders });
    if (isSettled(order)) return settled();
    if (order.status !== 'pending_payment' || order.payment_status !== 'pending') {
      return NextResponse.json({ success: false, error: 'Đơn hàng không còn chờ thanh toán.' }, { status: 409, headers: corsHeaders });
    }
    if (order.payment_link_id || order.checkout_url) {
      const remote = await reconcilePayment(order);
      if (remote.status === 'PAID') {
        const { data: latest, error: readError } = await db.from('orders').select('status,payment_status').eq('id', orderId).single();
        if (readError) throw readError;
        if (isSettled(latest)) return settled();
        throw new Error('Thanh toán đã được ghi nhận để xử lý hoàn tiền.');
      }
      if (remote.status === 'CANCELLED' || remote.status === 'EXPIRED') throw new Error('Link thanh toán đã đóng.');
    }
    if (!order.payment_expires_at || new Date(order.payment_expires_at).getTime() <= Date.now()) {
      return NextResponse.json({ success: false, error: 'Đơn hàng đã hết thời gian thanh toán.' }, { status: 409, headers: corsHeaders });
    }
    const cached = {
      success: true, orderCode: Number(order.payment_order_code),
      paymentLinkId: order.payment_link_id, checkoutUrl: order.checkout_url,
      qrCode: order.payos_qr_code || '', accountNumber: order.payos_account_number || '',
      accountName: order.payos_account_name || '', bin: order.payos_bin || '',
      amount: Number(order.final_amount), description: order.payos_description || '',
      expiresAt: order.payment_expires_at,
    };
    if (order.checkout_url) return NextResponse.json(cached, { headers: corsHeaders });
    const orderCode = Number(order.payment_order_code);
    if (!Number.isSafeInteger(orderCode) || orderCode <= 0) throw new Error('Invalid reserved payment code');
    const amount = Number(order.final_amount);
    const description = 'GSF ' + orderCode;
    const returnUrl = new URL('/explore/?view=payment&orderId=' + encodeURIComponent(orderId), request.url).href;
    const cancelUrl = returnUrl;
    const key = process.env.PAYOS_CHECKSUM_KEY;
    if (!key) throw new Error('PayOS credentials missing');
    const signature = crypto.createHmac('sha256', key)
      .update(`amount=${amount}&cancelUrl=${cancelUrl}&description=${description}&orderCode=${orderCode}&returnUrl=${returnUrl}`).digest('hex');
    let remote;
    try {
      remote = await payosRequest('', { orderCode, amount, description, returnUrl, cancelUrl, signature,
        expiredAt: Math.floor(new Date(order.payment_expires_at).getTime() / 1000) });
    } catch {
      // An interrupted/concurrent worker can only recover this same provider code.
      remote = await reconcilePayment(order);
      if (remote.status === 'PAID') {
        const { data: latest, error: readError } = await db.from('orders').select('status,payment_status').eq('id', orderId).single();
        if (readError) throw readError;
        if (isSettled(latest)) return settled();
        throw new Error('Thanh toán đã được ghi nhận để xử lý hoàn tiền.');
      }
      if (!['PENDING', 'PROCESSING'].includes(remote.status) || !remote.id) throw new Error('Không thể khôi phục link thanh toán.');
      remote = { ...remote, paymentLinkId: remote.id, checkoutUrl: 'https://pay.payos.vn/web/' + encodeURIComponent(remote.id) };
    }
    const patch = {
      payment_link_id: remote.paymentLinkId, checkout_url: remote.checkoutUrl,
      payos_qr_code: remote.qrCode || null, payos_description: remote.description || description,
      payos_account_number: remote.accountNumber || null,
      payos_account_name: remote.accountName || null, payos_bin: remote.bin || null,
    };
    // A recovering worker must not overwrite a complete QR saved by another worker.
    let update = db.from('orders').update(patch).eq('id', orderId).eq('payment_order_code', orderCode)
      .eq('status', 'pending_payment').eq('payment_status', 'pending');
    if (!remote.qrCode) update = update.is('payos_qr_code', null);
    const { error: saveError } = await update;
    if (saveError) throw new Error('Không thể lưu mã thanh toán. Vui lòng thử lại.');
    const { data: latest, error: readError } = await db.from('orders').select('*').eq('id', orderId).single();
    if (readError) throw readError;
    if (isSettled(latest)) return settled();
    if (latest.status !== 'pending_payment') throw new Error('Trạng thái đơn hàng đã thay đổi.');
    return NextResponse.json({ ...cached, checkoutUrl: latest.checkout_url,
      paymentLinkId: latest.payment_link_id, qrCode: latest.payos_qr_code || '',
      accountNumber: latest.payos_account_number || '', accountName: latest.payos_account_name || '',
      bin: latest.payos_bin || '', description: latest.payos_description || description,
    }, { headers: corsHeaders });
  } catch (error) {
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : 'Payment unavailable' }, { status: 503, headers: corsHeaders });
  }
}
