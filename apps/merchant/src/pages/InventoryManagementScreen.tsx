import { Box, CalendarDays } from 'lucide-react';
import { InventoryCard, InventoryToolbar } from '../components/inventory';
import { Button, EmptyState, ErrorState, SkeletonList, ToastBar } from '../components/ui';
import { useInventory } from '../hooks/useInventory';

export function InventoryManagementScreen({ storeId }: { storeId: string }) {
  const state = useInventory(storeId);

  if (state.error && !state.items.length) {
    return <ErrorState message={state.error} onRetry={() => void state.loadData()} />;
  }

  const totalQuantity = state.items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <>
      <ToastBar message={state.saveSuccessMessage} />
      <div className="merchant-screen-heading">
        <div>
          <span>Kiểm soát tồn kho</span>
          <h1>Kệ hàng & nguyên liệu</h1>
        </div>
        <strong>{totalQuantity} sản phẩm</strong>
      </div>

      <InventoryToolbar
        query={state.searchQuery}
        schedule={state.scheduleTab}
        onQuery={state.setSearchQuery}
        onSchedule={state.setScheduleTab}
      />

      <div className="merchant-list">
        {state.loading && !state.items.length ? (
          <SkeletonList count={4} height={90} />
        ) : state.items.length ? (
          state.items.map((item) => (
            <InventoryCard
              key={item.id}
              item={item}
              onIncrease={(id) => state.changeQuantity(id, 1)}
              onDecrease={(id) => state.changeQuantity(id, -1)}
              onToggleTomorrow={state.toggleTomorrow}
              onRemove={state.removeFromShelf}
            />
          ))
        ) : (
          <EmptyState
            icon={state.scheduleTab === 'tomorrow' ? <CalendarDays size={28} /> : <Box size={28} />}
            title={
              state.scheduleTab === 'tomorrow'
                ? 'Chưa có sản phẩm cho ngày mai'
                : 'Kệ hàng hôm nay đang trống'
            }
            message={
              state.scheduleTab === 'tomorrow'
                ? "Chuyển sang tab 'Hôm nay' và bật công tắc 'Áp dụng cho ngày mai' trên các sản phẩm bạn muốn tự động lên kệ vào ngày mai."
                : 'Tạo túi hàng mới tại mục Túi hàng để đưa sản phẩm lên kệ bán.'
            }
            action={
              state.scheduleTab === 'tomorrow' ? (
                <Button variant="outline" onClick={() => state.setScheduleTab('today')}>
                  Xem danh sách hôm nay
                </Button>
              ) : undefined
            }
          />
        )}
      </div>

      <div className="merchant-sticky-save">
        <div>
          <Button
            size="small"
            variant="secondary"
            disabled={!state.hasUnsavedChanges || state.saving}
            onClick={state.cancelChanges}
          >
            Hủy bỏ
          </Button>
          <Button
            size="small"
            loading={state.saving}
            disabled={!state.hasUnsavedChanges}
            onClick={() => void state.saveChanges()}
          >
            Lưu thay đổi
          </Button>
        </div>
      </div>
    </>
  );
}

