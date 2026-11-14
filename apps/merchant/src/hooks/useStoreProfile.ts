import { useEffectEvent, useCallback, useEffect, useRef, useState } from 'react';
import {
  fetchStoreProfile,
  getCachedStoreProfile,
  toggleStoreOpenStatus,
  updateStoreImages,
  updateStoreProfile,
} from '../services/store.service';
import { supabase } from '../services/supabase';
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
    if (!storeId) return;
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

  const [profileStoreId, setProfileStoreId] = useState(storeId);
  if (profileStoreId !== storeId) {
    setProfileStoreId(storeId);
    const cached = getCachedStoreProfile(storeId);
    if (cached) setProfile(cached);
    setLoading(!cached);
  }

  const refreshProfile = useEffectEvent(() => { void loadProfile(); });
  const lastFetchedStoreIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!storeId) return;

    if (lastFetchedStoreIdRef.current !== storeId) {
      lastFetchedStoreIdRef.current = storeId;
      refreshProfile();
    }
  }, [storeId, loadProfile]);

  // Lắng nghe Realtime trên bảng stores để đồng bộ trạng thái đóng/mở tức thì
  useEffect(() => {
    if (!storeId) return;
    const channelId = `merchant-store-status-${storeId}-${Math.random().toString(36).slice(2, 8)}`;
    const channel = supabase
      .channel(channelId)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'stores', filter: `id=eq.${storeId}` },
        (payload) => {
          if (payload.new && typeof payload.new.is_open === 'boolean') {
            setProfile((current) =>
              current ? { ...current, isOpen: payload.new.is_open } : null
            );
          }
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [storeId]);

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
    const nextIsOpen = profile ? !profile.isOpen : true;
    if (profile) setProfile({ ...profile, isOpen: nextIsOpen });
    try {
      const updated = await toggleStoreOpenStatus(storeId, nextIsOpen);
      if (updated) setProfile(updated);
      showToast(nextIsOpen ? 'Cửa hàng đã mở cửa' : 'Cửa hàng đang tạm đóng');
    } catch {
      setProfile(previous);
      showToast('Không thể cập nhật trạng thái cửa hàng.');
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
