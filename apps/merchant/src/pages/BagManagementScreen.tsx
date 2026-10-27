import { PackageOpen } from 'lucide-react';
import { useState } from 'react';
import { BagCard, BagEditorModal, BagFilterBar, DeleteBagConfirmModal } from '../components/bags';
import { Button, EmptyState, ErrorState, SkeletonList, ToastBar } from '../components/ui';
import { useBags } from '../hooks/useBags';
import type { BagItem } from '../types';

export function BagManagementScreen({ storeId }: { storeId: string }) {
  const state = useBags(storeId);
  const [bagToDelete, setBagToDelete] = useState<BagItem | null>(null);

  const openEdit = (bag: BagItem) => {
    state.setSelectedBag(bag);
    state.setIsEditModalOpen(true);
  };

  if (state.error && !state.allBags.length) return <ErrorState message={state.error} onRetry={() => void state.loadBags()} />;

  return (
    <>
      <ToastBar message={state.toastMessage} />
      <div className="merchant-screen-heading">
        <div>
          <span>Danh mục túi hàng</span>
          <h1>Quản lý túi hàng</h1>
        </div>
        <strong>{state.onShelfCount} trên kệ / {state.inStorageCount} trong kho</strong>
      </div>
      <BagFilterBar
        searchQuery={state.searchQuery}
        onSearchQueryChange={state.setSearchQuery}
        statusFilter={state.statusFilter}
        onStatusFilterChange={state.setStatusFilter}
        onShelfCount={state.onShelfCount}
        inStorageCount={state.inStorageCount}
        expiredCount={state.expiredCount}
        onOpenCreateModal={() => state.setIsCreateModalOpen(true)}
      />
      <div className="merchant-content-block">
        {state.loading && !state.allBags.length ? (
          <SkeletonList count={3} height={120} />
        ) : state.bags.length ? (
          <div className="merchant-bag-grid">
            {state.bags.map((bag) => (
              <BagCard
                key={bag.id}
                bag={bag}
                onToggleStatus={(id) => void state.toggleStatus(id)}
                onEdit={openEdit}
                onDelete={(item) => setBagToDelete(item)}
              />
            ))}
          </div>
        ) : (
          <EmptyState
            icon={<PackageOpen size={28} />}
            title={
              state.statusFilter === 'on_shelf'
                ? 'Không có túi nào trên kệ hàng'
                : state.statusFilter === 'in_storage'
                ? 'Không có túi nào trong kho'
                : 'Không có hàng hết hạn'
            }
            message={
              state.statusFilter === 'on_shelf'
                ? 'Hiện chưa có túi hàng nào đang trong thời gian mở bán.'
                : state.statusFilter === 'in_storage'
                ? 'Các túi chưa đến giờ mở bán hoặc đã gỡ kệ sẽ xuất hiện tại đây.'
                : undefined
            }
            action={
              state.statusFilter !== 'expired' ? (
                <Button onClick={() => state.setIsCreateModalOpen(true)}>Tạo túi mới</Button>
              ) : undefined
            }
          />
        )}
      </div>
      <BagEditorModal
        open={state.isCreateModalOpen}
        saving={state.saving}
        onClose={() => state.setIsCreateModalOpen(false)}
        onSubmit={(input) => void state.addBag(input)}
      />
      <DeleteBagConfirmModal
        bag={bagToDelete}
        open={Boolean(bagToDelete)}
        saving={state.saving}
        onClose={() => setBagToDelete(null)}
        onConfirm={(id) => {
          setBagToDelete(null);
          void state.removeBag(id);
        }}
      />
      <BagEditorModal
        key={state.selectedBag?.id ?? 'empty'}
        bag={state.selectedBag ?? undefined}
        open={state.isEditModalOpen}
        saving={state.saving}
        onClose={() => state.setIsEditModalOpen(false)}
        onSubmit={(input) => void state.editBag(input)}
      />
    </>
  );
}
