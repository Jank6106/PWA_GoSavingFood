import React, { useState } from 'react';
import { AlertTriangle, Trash2, X } from 'lucide-react';
import { Button, Input } from '@gosavingfood/ui';

interface DeleteAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmDelete: () => void | Promise<void>;
}

export const DeleteAccountModal: React.FC<DeleteAccountModalProps> = ({
  isOpen,
  onClose,
  onConfirmDelete,
}) => {
  const [confirmText, setConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  if (!isOpen) return null;

  const isConfirmed = confirmText.trim().toUpperCase() === 'XÓA' || confirmText.trim().toUpperCase() === 'XOA';

  const handleDelete = async () => {
    if (!isConfirmed || isDeleting) return;
    setIsDeleting(true);
    try {
      await onConfirmDelete();
      onClose();
    } catch {
      // Caller handles error feedback
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="gsf-drawer-backdrop" onClick={onClose} role="presentation">
      <div
        className="gsf-drawer-bottom gsf-drawer-bottom--danger"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-account-title"
      >
        <div className="gsf-drawer-handle" />

        <div className="gsf-drawer-header">
          <div className="gsf-drawer-title-group">
            <div className="gsf-drawer-icon-wrap gsf-drawer-icon-wrap--danger">
              <AlertTriangle size={20} />
            </div>
            <div>
              <h2 id="delete-account-title" className="gsf-drawer-title text-danger">
                Xóa tài khoản
              </h2>
              <p className="gsf-drawer-subtitle">
                Hành động này mang tính vĩnh viễn và không thể khôi phục
              </p>
            </div>
          </div>
          <button
            type="button"
            className="gsf-drawer-close"
            onClick={onClose}
            aria-label="Đóng"
          >
            <X size={20} />
          </button>
        </div>

        <div className="gsf-drawer-body">
          <div className="customer-delete-warning-card">
            <div className="customer-delete-warning-icon">
              <Trash2 size={28} />
            </div>
            <h4>Bạn có chắc chắn muốn xóa tài khoản?</h4>
            <p>
              Khi xóa tài khoản, tất cả dữ liệu sau sẽ bị xóa vĩnh viễn khỏi hệ thống
              GoSavingFood:
            </p>
            <ul className="customer-delete-warning-list">
              <li>Lịch sử tất cả các đơn hàng đã đặt và đã hoàn thành.</li>
              <li>Thống kê số lượng bữa ăn đã cứu và số tiền bạn đã tiết kiệm.</li>
              <li>Toàn bộ mã giảm giá còn hiệu lực trong ví voucher.</li>
              <li>Thông tin liên kết số điện thoại, email và hồ sơ cá nhân.</li>
            </ul>
          </div>

          <div className="customer-delete-confirm-box">
            <label className="customer-form-label">
              Để xác nhận, vui lòng nhập chữ <strong>XÓA</strong> vào ô bên dưới:
            </label>
            <Input
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder='Nhập "XÓA" để xác nhận'
              autoFocus
            />
          </div>
        </div>

        <div className="gsf-drawer-footer customer-delete-actions">
          <Button
            fullWidth
            variant="secondary"
            size="md"
            onClick={onClose}
            disabled={isDeleting}
          >
            Hủy bỏ
          </Button>
          <Button
            fullWidth
            variant="destructive"
            size="md"
            onClick={handleDelete}
            disabled={!isConfirmed || isDeleting}
          >
            <Trash2 size={16} />
            {isDeleting ? 'Đang xóa tài khoản...' : 'Xác nhận xóa tài khoản'}
          </Button>
        </div>
      </div>
    </div>
  );
};
