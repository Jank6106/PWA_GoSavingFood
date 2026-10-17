import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

function createSignature(
  data: {
    amount: number;
    cancelUrl: string;
    description: string;
    orderCode: number;
    returnUrl: string;
  },
  key: string
) {
  const signData = `amount=${data.amount}&cancelUrl=${data.cancelUrl}&description=${data.description}&orderCode=${data.orderCode}&returnUrl=${data.returnUrl}`;
  return crypto.createHmac('sha256', key).update(signData).digest('hex');
}

// In-memory lock để deduplicate concurrent requests cho cùng một orderId (tránh tạo trùng đơn trên PayOS)
const inFlightRequests = new Map<string, Promise<unknown>>();

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { orderId, amount, description, items, returnUrl, cancelUrl } = body;

    if (!orderId || !amount) {
      return NextResponse.json(
        { success: false, error: 'orderId and amount are required' },
        { status: 400, headers: corsHeaders }
      );
    }

    // 1. Deduplicate concurrent requests (React StrictMode hoặc double-click)
    if (inFlightRequests.has(orderId)) {
      console.log(`[PayOS] Deduplicating concurrent create-payment for orderId: ${orderId}`);
      try {
        const sharedResult = await inFlightRequests.get(orderId);
        return NextResponse.json(sharedResult, { headers: corsHeaders });
      } catch (err: unknown) {
        const errMsg = err instanceof Error ? err.message : 'Payment creation failed';
        return NextResponse.json(
          { success: false, error: errMsg },
          { status: 500, headers: corsHeaders }
        );
      }
    }

    // 2. NGAY LẬP TỨC đăng ký Promise xử lý vào Map TRƯỚC BẤT KỲ AWAIT NÀO!
    let resolveInFlight!: (val: unknown) => void;
    let rejectInFlight!: (err: unknown) => void;
    const inFlightPromise = new Promise((resolve, reject) => {
      resolveInFlight = resolve;
      rejectInFlight = reject;
    });
    inFlightRequests.set(orderId, inFlightPromise);

    (async () => {
      try {
        const clientId = process.env.PAYOS_CLIENT_ID;
        const apiKey = process.env.PAYOS_API_KEY;
        const checksumKey = process.env.PAYOS_CHECKSUM_KEY;

        if (!clientId || !apiKey || !checksumKey) {
          throw new Error('PayOS credentials not configured on server');
        }

        // PayOS yêu cầu orderCode là số nguyên (tối đa 9007199254740991)
        // Dùng timestamp 6 chữ số cuối + 2 số ngẫu nhiên để tránh trùng
        const orderCode = Number(String(Date.now()).slice(-6) + Math.floor(Math.random() * 90 + 10));

        // Description tối đa 25 ký tự, không dấu
        const cleanDesc = (description || `GSF ${String(orderCode).slice(-4)}`)
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/[^a-zA-Z0-9 -]/g, '')
          .trim()
          .slice(0, 25);

        const supabaseUrl = process.env.SUPABASE_URL;
        const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
        const supabaseAdmin = supabaseUrl && serviceRoleKey ? createClient(supabaseUrl, serviceRoleKey) : null;

        // Kiểm tra xem đơn hàng đã được tạo link thanh toán trước đó hay chưa (Idempotency)
        if (supabaseAdmin) {
          const { data: existingOrder } = await supabaseAdmin
            .from('orders')
            .select('payment_order_code, payment_link_id, checkout_url')
            .eq('id', orderId)
            .single();

          if (existingOrder?.payment_order_code && existingOrder?.checkout_url) {
            console.log(`[PayOS] Order ${orderId} already has payment link ${existingOrder.payment_order_code}. Reusing.`);
            try {
              const checkRes = await fetch(
                `https://api-merchant.payos.vn/v2/payment-requests/${existingOrder.payment_order_code}`,
                {
                  method: 'GET',
                  headers: {
                    'x-client-id': clientId,
                    'x-api-key': apiKey,
                  },
                }
              );
              const checkData = await checkRes.json();
              if (checkData.code === '00' && checkData.data) {
                resolveInFlight({
                  success: true,
                  orderCode: existingOrder.payment_order_code,
                  paymentLinkId: existingOrder.payment_link_id,
                  checkoutUrl: existingOrder.checkout_url,
                  qrCode: checkData.data.qrCode,
                  accountNumber: checkData.data.accountNumber || '8823316420',
                  accountName: checkData.data.accountName || 'NGUYEN HUU DANH',
                  bin: checkData.data.bin || '970418',
                  amount,
                  description: checkData.data.description || cleanDesc,
                });
                return;
              }
            } catch (reuseErr) {
              console.warn('[PayOS] Query existing payment link error, falling back:', reuseErr);
            }
          }
        }

        interface PaymentItem {
          name?: string;
          quantity?: number;
          price?: number;
        }

        const payload: {
          orderCode: number;
          amount: number;
          description: string;
          cancelUrl: string;
          returnUrl: string;
          signature?: string;
          items?: Array<{ name: string; quantity: number; price: number }>;
        } = {
          orderCode,
          amount: Math.round(amount),
          description: cleanDesc,
          cancelUrl: cancelUrl || 'https://gosavingfood.vn/checkout',
          returnUrl: returnUrl || `https://gosavingfood.vn/orders/success?orderId=${orderId}`,
        };

        if (Array.isArray(items) && items.length > 0) {
          payload.items = (items as PaymentItem[]).map((it) => ({
            name: String(it.name || 'Món ăn').slice(0, 50),
            quantity: Number(it.quantity || 1),
            price: Number(it.price || amount),
          }));
        }

        payload.signature = createSignature(
          {
            amount: payload.amount,
            cancelUrl: payload.cancelUrl,
            description: payload.description,
            orderCode: payload.orderCode,
            returnUrl: payload.returnUrl,
          },
          checksumKey
        );

        // Gửi request tới PayOS API
        const payosRes = await fetch('https://api-merchant.payos.vn/v2/payment-requests', {
          method: 'POST',
          headers: {
            'x-client-id': clientId,
            'x-api-key': apiKey,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });

        const payosData = await payosRes.json();

        if (payosData.code !== '00') {
          console.error('[PayOS] createPaymentLink error:', payosData);
          throw new Error(payosData.desc || 'PayOS Error');
        }

        const {
          checkoutUrl,
          qrCode,
          accountNumber,
          accountName,
          bin,
          paymentLinkId,
          description: payosDescription,
        } = payosData.data;

        // Cập nhật thông tin PayOS vào Supabase orders
        if (supabaseAdmin) {
          await supabaseAdmin
            .from('orders')
            .update({
              payment_order_code: orderCode,
              payment_link_id: paymentLinkId,
              checkout_url: checkoutUrl,
              updated_at: new Date().toISOString(),
            })
            .eq('id', orderId);
        }

        resolveInFlight({
          success: true,
          orderCode,
          paymentLinkId,
          checkoutUrl,
          qrCode,
          accountNumber: String(accountNumber || '8823316420'),
          accountName: accountName || 'NGUYEN HUU DANH',
          bin: bin || '970418',
          amount,
          description: payosDescription || cleanDesc,
        });
      } catch (err) {
        rejectInFlight(err);
      }
    })();

    try {
      const responseData = await inFlightPromise;
      return NextResponse.json(responseData, { headers: corsHeaders });
    } finally {
      inFlightRequests.delete(orderId);
    }
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Internal Server Error';
    console.error('[PayOS] Create payment error:', err);
    return NextResponse.json(
      { success: false, error: errorMsg },
      { status: 500, headers: corsHeaders }
    );
  }
}
