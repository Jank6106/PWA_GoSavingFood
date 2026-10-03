import { useState } from 'react';
import {
  ChangePasswordModal,
  DeleteMerchantAccountModal,
  StoreActionsListCard,
  StoreCoverHeader,
  StoreInfoFormCard,
  SupportModal,
} from '../components/store';
import { ErrorState, SkeletonCard, SkeletonList, ToastBar } from '../components/ui';
import { useStoreProfile } from '../hooks/useStoreProfile';

export function SettingsScreen({
  storeId,
  authLoading,
  onChangePassword,
  onLogout,
  onDeleteAccount,
}: {
  storeId: string;
  authLoading: boolean;
  onChangePassword: (oldPassword: string, newPassword: string) => Promise<boolean>;
  onLogout: () => Promise<void>;
  onDeleteAccount?: () => Promise<void>;
}) {
  const state = useStoreProfile(storeId);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  if (state.error && !state.profile) return <ErrorState message={state.error} onRetry={() => void state.loadProfile()} />;
  const changePassword = async (oldPassword: string, newPassword: string) => {
    const done = await onChangePassword(oldPassword, newPassword);
    if (done) state.showToast('Đã cập nhật mật khẩu');
    return done;
  };
  return (
    <>
      <ToastBar message={state.toastMessage} />
      <div className="merchant-screen-heading">
        <div>
          <span>Hồ sơ đối tác</span>
          <h1>Thông tin & cài đặt</h1>
        </div>
      </div>
      {!state.profile ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <SkeletonCard height={180} />
          <div className="merchant-settings-grid">
            <SkeletonCard height={320} />
            <SkeletonList count={3} height={60} />
          </div>
        </div>
      ) : (
        <>
          <StoreCoverHeader profile={state.profile} saving={state.saving} onSaveImages={(input) => void state.saveImages(input)} />
          <div className="merchant-settings-grid">
            <StoreInfoFormCard profile={state.profile} saving={state.saving} onSave={(input) => void state.saveProfile(input)} />
            <StoreActionsListCard
              onPassword={() => state.setIsPasswordModalOpen(true)}
              onSupport={() => state.setIsSupportModalOpen(true)}
              onLogout={() => void onLogout()}
              onDeleteAccount={onDeleteAccount ? () => setIsDeleteModalOpen(true) : undefined}
            />
          </div>
          <ChangePasswordModal open={state.isPasswordModalOpen} saving={authLoading} onClose={() => state.setIsPasswordModalOpen(false)} onSubmit={changePassword} />
          <SupportModal open={state.isSupportModalOpen} onClose={() => state.setIsSupportModalOpen(false)} onSuccess={() => state.showToast('Yêu cầu hỗ trợ đã được gửi')} />
          {onDeleteAccount && (
            <DeleteMerchantAccountModal
              open={isDeleteModalOpen}
              saving={authLoading}
              onClose={() => setIsDeleteModalOpen(false)}
              onSubmit={async () => {
                await onDeleteAccount();
                setIsDeleteModalOpen(false);
              }}
            />
          )}
        </>
      )}
    </>
  );
}
