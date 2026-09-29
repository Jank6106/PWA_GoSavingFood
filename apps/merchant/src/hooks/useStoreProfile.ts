import { useCallback, useEffect, useState } from 'react';
import { fetchStoreProfile, toggleStoreOpenStatus, updateStoreImages, updateStoreProfile } from '../services/store.service';
import type { StoreImageUpdate, StoreProfile, StoreUpdateInput } from '../types';
import { useToast } from './useToast';

export function useStoreProfile(storeId: string) {
  const [profile, setProfile] = useState<StoreProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [isSupportModalOpen, setIsSupportModalOpen] = useState(false);
  const { toastMessage, showToast } = useToast();
  const loadProfile = useCallback(async () => { setLoading(true); setError(null); try { setProfile(await fetchStoreProfile(storeId)); } catch { setError('Không thể tải thông tin cửa hàng.'); } finally { setLoading(false); } }, [storeId]);
  useEffect(() => { const timer = window.setTimeout(() => { void loadProfile(); }, 0); return () => window.clearTimeout(timer); }, [loadProfile]);
  const saveProfile = async (input: StoreUpdateInput) => { setSaving(true); try { setProfile(await updateStoreProfile(storeId, input)); showToast('Đã lưu thông tin cửa hàng'); } catch (error) { showToast(error instanceof Error ? error.message : 'Không thể lưu thông tin cửa hàng.'); } finally { setSaving(false); } };
  const saveImages = async (input: StoreImageUpdate) => { setSaving(true); try { setProfile(await updateStoreImages(storeId, input)); showToast('Đã cập nhật ảnh cửa hàng'); } catch (error) { showToast(error instanceof Error ? error.message : 'Không thể cập nhật ảnh cửa hàng.'); } finally { setSaving(false); } };
  const toggleStatus = async () => { const previous = profile; if (profile) setProfile({ ...profile, isOpen: !profile.isOpen }); try { setProfile(await toggleStoreOpenStatus(storeId)); showToast(profile?.isOpen ? 'Cửa hàng đang tạm đóng' : 'Cửa hàng đã mở cửa'); } catch { setProfile(previous); } };
  return { profile, loading, error, saving, toastMessage, isPasswordModalOpen, isSupportModalOpen, setIsPasswordModalOpen, setIsSupportModalOpen, saveProfile, saveImages, toggleStatus, loadProfile, showToast };
}
