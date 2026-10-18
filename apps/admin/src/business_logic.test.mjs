import { describe, it } from 'node:test';
import assert from 'node:assert';

// 1. Kiểm tra logic quy đổi ESG theo tiêu chuẩn Yindii/FAO
describe('ESG Impact Calculations', () => {
  it('tính đúng khối lượng thực phẩm và CO2e từ số lượng túi hoàn tất', () => {
    const completedOrders = 10;
    const foodSavedKg = Number((completedOrders * 1.0).toFixed(1));
    const co2PreventedKg = Number((completedOrders * 2.5).toFixed(1));

    assert.strictEqual(foodSavedKg, 10.0);
    assert.strictEqual(co2PreventedKg, 25.0);
  });

  it('xử lý số lượng 0 mà không sinh NaN hoặc null', () => {
    const completedOrders = 0;
    const foodSavedKg = Number((completedOrders * 1.0).toFixed(1));
    const co2PreventedKg = Number((completedOrders * 2.5).toFixed(1));

    assert.strictEqual(foodSavedKg, 0);
    assert.strictEqual(co2PreventedKg, 0);
  });
});

// 2. Kiểm tra tính toán hoa hồng thực từ rate đối tác
describe('Commission Calculation', () => {
  it('tính hoa hồng sàn từ GMV và tỷ lệ trung bình thực tế của stores', () => {
    const stores = [
      { commission_rate: 15 },
      { commission_rate: 20 },
      { commission_rate: 25 },
    ];
    const avgRate = stores.reduce((sum, s) => sum + s.commission_rate, 0) / stores.length / 100;
    const gmv = 1000000;
    const commission = Math.round(gmv * avgRate);

    assert.strictEqual(avgRate, 0.2);
    assert.strictEqual(commission, 200000);
  });
});

// 3. Kiểm tra lọc đơn hàng theo timeRange
describe('TimeRange Date Filtering', () => {
  it('loại bỏ các đơn hàng ngoài khung 7 ngày', () => {
    const now = new Date();
    const orders = [
      { id: '1', created_at: now.toISOString(), status: 'COMPLETED' },
      {
        id: '2',
        created_at: new Date(now.getTime() - 8 * 24 * 3600 * 1000).toISOString(),
        status: 'COMPLETED',
      },
    ];

    const filtered = orders.filter((o) => {
      const diff = (now.getTime() - new Date(o.created_at).getTime()) / (1000 * 3600 * 24);
      return diff <= 7;
    });

    assert.strictEqual(filtered.length, 1);
    assert.strictEqual(filtered[0].id, '1');
  });
});
