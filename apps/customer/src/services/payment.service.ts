import { supabase } from './supabase';
import type { RealtimeChannel, RealtimePostgresUpdatePayload } from '@supabase/supabase-js';
interface PaymentRow { status: string; payment_status: string }
export const paymentService = {
  readOrder(id: string) { return supabase.from('orders').select('*').eq('id', id).maybeSingle(); },
  removeChannel(channel: RealtimeChannel) { return supabase.removeChannel(channel); },
  subscribe(id: string, callback: (payload: RealtimePostgresUpdatePayload<PaymentRow>) => void) {
    return supabase.channel('order-payment-realtime-' + id)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders', filter: 'id=eq.' + id }, callback)
      .subscribe();
  },
};
