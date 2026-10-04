import { useCallback, useEffect, useRef, useState } from 'react';
import {
  fetchStoreProfile,
  getCachedStoreProfile,
  toggleStoreOpenStatus,
  updateStoreImages,
  updateStoreProfile,
} from '../services/store.service';
import type { StoreImageUpdate, StoreProfile, StoreUpdateInput } from '../types';
import { useToast } from './useToast';

export function useStoreProfile(storeId: string) {
  // SWR: Đọc dữ liệu từ cache ngay lập tức để render 0ms
  const [profile, setProfile] = useState<StoreProfile | null>(() => getCachedStoreProfile(storeId));
  const [loading, setLoading] = useState(() => !profile);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [isSupportModalOpen, setIsSupportModalOpen] = useState(false);
  const { toastMessage, showToast } = useToast();

  const loadProfile = useCallback(async () => {
    setError(null);
    try {
      const data = await fetchStoreProfile(storeId);
      if (data) setProfile(data);
    } catch {
      setError('Không thể tải thông tin cửa hàng.');
    } finally {
      setLoading(false);
    }
  }, [storeId]);

  const isFetchedRef = useRef(false);

  useEffect(() => {
    if (!isFetchedRef.current) {
      isFetchedRef.current = true;
      void loadProfile();
    }
  }, [loadProfile]);

  const saveProfile = async (input: StoreUpdateInput) => {
    setSaving(true);
    try {
      setProfile(await updateStoreProfile(storeId, input));
      showToast('Đã lưu thông tin cửa hàng');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Không thể lưu thông tin cửa hàng.');
    } finally {
      setSaving(false);
    }
  };

  const saveImages = async (input: StoreImageUpdate) => {
    setSaving(true);
    try {
      setProfile(await updateStoreImages(storeId, input));
      showToast('Đã cập nhật ảnh cửa hàng');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Không thể cập nhật ảnh cửa hàng.');
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = async () => {
    const previous = profile;
    if (profile) setProfile({ ...profile, isOpen: !profile.isOpen });
    try {
      setProfile(await toggleStoreOpenStatus(storeId));
      showToast(profile?.isOpen ? 'Cửa hàng đang tạm đóng' : 'Cửa hàng đã mở cửa');
    } catch {
      setProfile(previous);
    }
  };

  return {
    profile,
    loading,
    error,
    saving,
    toastMessage,
    isPasswordModalOpen,
    isSupportModalOpen,
    setIsPasswordModalOpen,
    setIsSupportModalOpen,
    saveProfile,
    saveImages,
    toggleStatus,
    loadProfile,
    showToast,
  };
}
