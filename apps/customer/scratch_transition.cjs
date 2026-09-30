const { createClient } = require('@supabase/supabase-js');

const url = 'https://nyxovkcokjsjdnwiddmc.supabase.co';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im55eG92a2Nva2pzamRud2lkZG1jIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NTQ4NTMzOCwiZXhwIjoyMTAxMDYxMzM4fQ.eF-CCNyTNtPEaGWg_8EH4nv6oms0HDqMnFBMbMs2Fvk';
const supabase = createClient(url, serviceRoleKey);

async function main() {
  const orderId = '49406bc5-a53e-45d2-9d7e-9ad9018227d9';
  console.log('Transitioning order to ready_for_pickup in DB...');
  const { data: updateData, error: updateErr } = await supabase
    .from('orders')
    .update({ 
      status: 'ready_for_pickup',
      updated_at: new Date().toISOString()
    })
    .eq('id', orderId)
    .select();
    
  console.log('Updated order result:', updateData, updateErr);

  // Send notification for ready_for_pickup
  const { error: notifErr } = await supabase.from('notifications').insert({
    user_id: '550c2813-e8e2-4185-a11b-7cfc31370ab1',
    title: 'Đơn hàng sẵn sàng lấy',
    body: 'Đơn hàng GSF-49406B đã sẵn sàng tại quán. Mời bạn ghé nhận!',
    type: 'order_status',
    icon: 'order',
    is_read: false
  });
  console.log('Notification sent:', notifErr);
}

main().catch(console.error);
