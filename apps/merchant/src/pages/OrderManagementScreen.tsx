import { useState } from 'react';
import { FileSearch } from 'lucide-react';
import { EmptyState, ErrorState, SkeletonList, ToastBar } from '../components/ui';
import { CancelOrderModal, GlobalQRScannerModal, OrderCard, OrderDetailsModal, OrderFilterBar } from '../components/orders';
import { useOrders } from '../hooks/useOrders';
import { useToast } from '../hooks/useToast';
import type { MerchantOrder } from '../types';

interface OrderManagementScreenProps {
  storeId: string;
  targetOrderId?: string | null;
  onClearTargetOrder?: () => void;
  isGlobalQROpen?: boolean;
  onCloseGlobalQR?: () => void;
}

export function OrderManagementScreen({
  storeId,
  targetOrderId,
  onClearTargetOrder,
  isGlobalQROpen,
  onCloseGlobalQR,
}: OrderManagementScreenProps) {
  const state = useOrders(storeId, targetOrderId);
  const { toastMessage: copyToastMessage, showToast } = useToast();
  const [cancellingOrder, setCancellingOrder] = useState<MerchantOrder | null>(null);
  const [isGlobalQRModalOpen, setIsGlobalQRModalOpen] = useState(false);

  const [scannerInputs, setScannerInputs] = useState<readonly unknown[] | null>(null);
  // Reset the draft/cache when its inputs change, before committing stale UI.
  if (scannerInputs === null || [isGlobalQROpen].some((value, index) => !Object.is(value, scannerInputs[index]))) {
    setScannerInputs([isGlobalQROpen]);

    if (isGlobalQROpen) {
      setIsGlobalQRModalOpen(true);
    }

  }

  const openQR = (order: typeof state.selectedOrder) => {
    if (!order) return;
    state.setSelectedOrder(order);
    state.setIsDetailModalOpen(false);
    setIsGlobalQRModalOpen(true);
  };

  const handleCopyCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      showToast(`Đã sao chép mã đơn: ${code}`);
    } catch {
      showToast(`Mã đơn: ${code}`);
    }
  };

  const handleCopyReceipt = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      showToast('Đã sao chép thông tin chi tiết đơn hàng');
    } catch {
      showToast('Không thể sao chép');
    }
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
    onCancelRequest: (order: MerchantOrder) => {
      setCancellingOrder(order);
    },
    onOpenQR: openQR,
    onOpenDetails: (order: MerchantOrder) => {
      state.setSelectedOrder(order);
      state.setIsDetailModalOpen(true);
    },
    onCopyCode: handleCopyCode,
  };

  const handleConfirmCancel = async (orderId: string, reason: string) => {
    const ok = await state.cancelOrder(orderId, reason);
    if (ok) {
      state.setIsDetailModalOpen(false);
      state.setStatusFilter('all');
      setCancellingOrder(null);
      onClearTargetOrder?.();
    }
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
      <div className="merchant-content-block">
        {state.loading && !state.orders.length ? (
          <SkeletonList count={3} height={140} />
        ) : state.orders.length ? (
          <div className="merchant-order-grid">
            {state.orders.map((order) => (
              <OrderCard
                key={order.id}
                order={order}
                {...actions}
                onOpenDetails={(item) => {
                  state.setSelectedOrder(item);
                  state.setIsDetailModalOpen(true);
                }}
              />
            ))}
          </div>
        ) : (
          <EmptyState
            icon={<FileSearch size={28} />}
            title="Không có đơn phù hợp"
            message="Hãy thử chọn trạng thái khác hoặc thay đổi từ khóa."
          />
        )}
      </div>
      <ToastBar message={copyToastMessage} />
      <OrderDetailsModal
        order={state.selectedOrder}
        open={state.isDetailModalOpen}
        onClose={() => {
          state.setIsDetailModalOpen(false);
          onClearTargetOrder?.();
        }}
        actions={actions}
        onCopyReceipt={handleCopyReceipt}
      />
      <CancelOrderModal
        order={cancellingOrder}
        open={Boolean(cancellingOrder)}
        saving={state.saving}
        onClose={() => setCancellingOrder(null)}
        onConfirmCancel={handleConfirmCancel}
      />
      <GlobalQRScannerModal
        open={isGlobalQRModalOpen || Boolean(isGlobalQROpen)}
        allOrders={state.allOrders}
        onClose={() => {
          setIsGlobalQRModalOpen(false);
          onCloseGlobalQR?.();
        }}
        onCompleteQR={async (id, code) => {
          const ok = await state.completeOrderWithQR(id, code);
          if (ok) {
            state.setStatusFilter('all');
            onClearTargetOrder?.();
          }
          return ok;
        }}
        onOpenOrderDetails={(order) => {
          state.setSelectedOrder(order);
          state.setIsDetailModalOpen(true);
        }}
      />
    </>
  );
}
