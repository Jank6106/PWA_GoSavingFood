import { FileSearch } from 'lucide-react';
import { EmptyState, ErrorState, SkeletonList, ToastBar } from '../components/ui';
import { OrderCard, OrderDetailsModal, OrderFilterBar, QRScannerModal } from '../components/orders';
import { useOrders } from '../hooks/useOrders';

interface OrderManagementScreenProps {
  storeId: string;
  targetOrderId?: string | null;
  onClearTargetOrder?: () => void;
}

export function OrderManagementScreen({
  storeId,
  targetOrderId,
  onClearTargetOrder,
}: OrderManagementScreenProps) {
  const state = useOrders(storeId, targetOrderId);
  const openQR = (order: typeof state.selectedOrder) => {
    if (!order) return;
    state.setSelectedOrder(order);
    state.setIsDetailModalOpen(false);
    state.setIsQRModalOpen(true);
  };
  const actions = {
    onConfirm: async (id: string) => {
      const ok = await state.confirmOrder(id);
      if (ok) {
        state.setIsDetailModalOpen(false);
        state.setStatusFilter('all');
        onClearTargetOrder?.();
      }
    },
    onFinishPreparation: async (id: string) => {
      const ok = await state.finishPreparationOrder(id);
      if (ok) {
        state.setIsDetailModalOpen(false);
        state.setStatusFilter('all');
        onClearTargetOrder?.();
      }
    },
    onCancel: async (id: string) => {
      const ok = await state.cancelOrder(id);
      if (ok) {
        state.setIsDetailModalOpen(false);
        state.setStatusFilter('all');
        onClearTargetOrder?.();
      }
    },
    onOpenQR: openQR,
  };

  if (state.error && !state.allOrders.length) return <ErrorState message={state.error} onRetry={() => void state.loadOrders()} />;

  return (
    <>
      <ToastBar message={state.toastMessage} />
      <div className="merchant-screen-heading">
        <div>
          <span>Hôm nay</span>
          <h1>Quản lý đơn hàng</h1>
        </div>
        <strong>
          {state.summary.pending + state.summary.processing + state.summary.confirmed} đơn
        </strong>
      </div>
      <OrderFilterBar
        statusFilter={state.statusFilter}
        searchQuery={state.searchQuery}
        summary={state.summary}
        onStatusFilterChange={state.setStatusFilter}
        onSearchQueryChange={state.setSearchQuery}
      />
      <div className="merchant-order-grid">
        {state.loading && !state.orders.length ? (
          <SkeletonList count={3} height={140} />
        ) : state.orders.length ? (
          state.orders.map((order) => (
            <OrderCard
              key={order.id}
              order={order}
              {...actions}
              onOpenDetails={(item) => {
                state.setSelectedOrder(item);
                state.setIsDetailModalOpen(true);
              }}
            />
          ))
        ) : (
          <EmptyState
            icon={<FileSearch size={28} />}
            title="Không có đơn phù hợp"
            message="Hãy thử chọn trạng thái khác hoặc thay đổi từ khóa."
          />
        )}
      </div>
      <OrderDetailsModal
        order={state.selectedOrder}
        open={state.isDetailModalOpen}
        onClose={() => {
          state.setIsDetailModalOpen(false);
          onClearTargetOrder?.();
        }}
        actions={actions}
      />
      <QRScannerModal
        order={state.selectedOrder}
        open={state.isQRModalOpen}
        saving={state.saving}
        onClose={() => {
          state.setIsQRModalOpen(false);
          onClearTargetOrder?.();
        }}
        onCompleteQR={async (id, code) => {
          const ok = await state.completeOrderWithQR(id, code);
          if (ok) {
            state.setStatusFilter('all');
            onClearTargetOrder?.();
          }
          return ok;
        }}
      />
    </>
  );
}
