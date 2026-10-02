import { PackageOpen } from 'lucide-react';
import { BagCard, BagDetailsModal, BagEditorModal, BagFilterBar } from '../components/bags';
import { Button, EmptyState, ErrorState, LoadingSpinner, ToastBar } from '../components/ui';
import { useBags } from '../hooks/useBags';

export function BagManagementScreen({ storeId }: { storeId: string }) {
  const state = useBags(storeId);
  const openEdit = (bag: typeof state.selectedBag) => {
    if (!bag) return;
    state.setSelectedBag(bag);
    state.setIsDetailModalOpen(false);
    state.setIsEditModalOpen(true);
  };

  if (state.loading && !state.allBags.length && !state.hasLoadedOnce) return <LoadingSpinner />;
  if (state.error && !state.allBags.length) return <ErrorState message={state.error} onRetry={() => void state.loadBags()} />;

  return (
    <>
      <ToastBar message={state.toastMessage} />
      <div className="merchant-screen-heading">
        <div>
          <span>Danh mục túi hàng</span>
          <h1>Quản lý túi hàng</h1>
        </div>
        <strong>{state.onShelfCount} đang lên kệ / {state.allBags.length} tổng</strong>
      </div>
      <BagFilterBar
        searchQuery={state.searchQuery}
        onSearchQueryChange={state.setSearchQuery}
        statusFilter={state.statusFilter}
        onStatusFilterChange={state.setStatusFilter}
        allCount={state.allBags.length}
        onShelfCount={state.onShelfCount}
        offShelfCount={state.offShelfCount}
        onOpenCreateModal={() => state.setIsCreateModalOpen(true)}
      />
      <div className="merchant-list">
        {state.bags.length ? (
          state.bags.map((bag) => (
            <BagCard
              key={bag.id}
              bag={bag}
              onToggleStatus={(id) => void state.toggleStatus(id)}
              onIncreaseQuantity={(id) => void state.changeQuantity(id, 1)}
              onDecreaseQuantity={(id) => void state.changeQuantity(id, -1)}
              onOpenDetails={(item) => {
                state.setSelectedBag(item);
                state.setIsDetailModalOpen(true);
              }}
              onEdit={openEdit}
            />
          ))
        ) : (
          <EmptyState
            icon={<PackageOpen size={28} />}
            title={
              state.statusFilter === 'on_shelf'
                ? 'Không có túi nào đang lên kệ'
                : state.statusFilter === 'off_shelf'
                ? 'Không có túi nào đã gỡ kệ'
                : 'Chưa có túi hàng'
            }
            message={
              state.statusFilter === 'all'
                ? 'Tạo túi đầu tiên để bắt đầu giải cứu thực phẩm.'
                : 'Thử chuyển bộ lọc hoặc đưa túi lên kệ.'
            }
            action={
              state.statusFilter === 'all' ? (
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
      <BagDetailsModal
        bag={state.selectedBag}
        open={state.isDetailModalOpen}
        saving={state.saving}
        onClose={() => state.setIsDetailModalOpen(false)}
        onToggleStatus={(id) => void state.toggleStatus(id)}
        onDelete={(id) => void state.removeBag(id)}
        onEdit={openEdit}
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
