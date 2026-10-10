import { supabase } from './supabase';
import { calculateDistanceKm, formatDistance, mapboxService } from './mapbox.service';
import {
  parseIdentifier,
  isValidEmail,
  mapSupabaseAuthError,
} from '../shared/utils/validation';
import type {
  Banner,
  Brand,
  Category,
  FoodCategory,
  LocationSuggestion,
  Merchant,
  NotificationItem,
  Order,
  SurpriseBag,
  User,
  Voucher,
} from '../shared/types/customer.types';

// Nội dung UI tĩnh (banner & danh mục không có bảng riêng trong DB)
export const HOME_BANNERS: Banner[] = [
  {
    id: 'banner-1',
    eyebrow: 'Giải cứu hôm nay',
    title: 'Ngon hơn khi không bị lãng phí',
    description: 'Túi bất ngờ từ các cửa hàng quanh bạn, giảm đến 70%.',
    accent: 'green',
    icon: 'bag',
    imageUrl: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=720&q=75',
  },
  {
    id: 'banner-2',
    eyebrow: 'Ưu đãi thành viên',
    title: 'Giảm thêm 20.000đ cho đơn đầu tiên',
    description: 'Dùng mã HELLOGSF khi thanh toán đơn từ 50.000đ.',
    accent: 'yellow',
    icon: 'ticket',
    imageUrl: 'https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=720&q=75',
  },
  {
    id: 'banner-3',
    eyebrow: 'Tác động xanh',
    title: 'Mỗi túi cứu được giảm 2,5kg CO₂',
    description: 'Một lựa chọn nhỏ, thêm một ngày tốt cho hành tinh.',
    accent: 'mint',
    icon: 'globe',
    imageUrl: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=720&q=75',
  },
];

export const HOME_CATEGORIES: Category[] = [
  { id: 'all', label: 'Tất cả', icon: 'all' },
  { id: 'bakery', label: 'Bánh ngọt', icon: 'bakery' },
  { id: 'meat', label: 'Món nóng', icon: 'meat' },
  { id: 'vegetarian', label: 'Ăn xanh', icon: 'vegetarian' },
  { id: 'beverage', label: 'Đồ uống', icon: 'beverage' },
  { id: 'other', label: 'Túi bí mật', icon: 'other' },
];

const formatRelativeTime = (iso?: string | null) => {
  if (!iso) return '';
  const milliseconds = Date.now() - new Date(iso).getTime();
  if (!Number.isFinite(milliseconds) || milliseconds < 0) return 'Vừa xong';
  const minutes = Math.floor(milliseconds / 60000);
  if (minutes < 1) return 'Vừa xong';
  if (minutes < 60) return `${minutes} phút trước`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} giờ trước`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} ngày trước`;
  return new Date(iso).toLocaleDateString('vi-VN');
};

export const optimizeImageUrl = (url?: string | null, width = 480, quality = 75): string => {
  if (!url) return '';
  if (url.includes('images.unsplash.com')) {
    const base = url.split('?')[0];
    return `${base}?auto=format&fit=crop&w=${width}&q=${quality}`;
  }
  return url;
};

const getBagImage = (name: string, url?: string | null) => {
  if (url && (url.startsWith('http') || url.startsWith('blob:'))) {
    return optimizeImageUrl(url, 480, 75);
  }
  if (url && url.startsWith('data:') && url.length < 50000) {
    return url;
  }
  const n = (name || '').toLowerCase();
  if (n.includes('salad'))
    return optimizeImageUrl('https://images.unsplash.com/photo-1512621776951-a57141f2eefd', 480, 75);
  if (n.includes('nước ép') || n.includes('thơm') || n.includes('uống'))
    return optimizeImageUrl('https://images.unsplash.com/photo-1613478223719-2ab802602423', 480, 75);
  if (n.includes('trái cây') || n.includes('hoa quả'))
    return optimizeImageUrl('https://images.unsplash.com/photo-1619566636858-adf3ef46400b', 480, 75);
  if (n.includes('bánh'))
    return optimizeImageUrl('https://images.unsplash.com/photo-1509440159596-0249088772ff', 480, 75);
  return optimizeImageUrl('https://images.unsplash.com/photo-1540420773420-3366772f4999', 480, 75);
};

const getStoreLogo = (url?: string | null) => {
  if (url && (url.startsWith('http') || url.startsWith('blob:'))) {
    return optimizeImageUrl(url, 120, 80);
  }
  if (url && url.startsWith('data:') && url.length < 30000) {
    return url;
  }
  return optimizeImageUrl('https://images.unsplash.com/photo-1555396273-367ea4eb4db5', 120, 80);
};

const getStoreBanner = (url?: string | null) => {
  if (url && (url.startsWith('http') || url.startsWith('blob:'))) {
    return optimizeImageUrl(url, 640, 75);
  }
  if (url && url.startsWith('data:') && url.length < 50000) {
    return url;
  }
  return optimizeImageUrl('https://images.unsplash.com/photo-1540420773420-3366772f4999', 640, 75);
};

const mapCreateOrderError = (error: { message?: string; details?: string } | null): string => {
  const raw = `${error?.message ?? ''} ${error?.details ?? ''}`;
  if (raw.includes('BAG_UNAVAILABLE'))
    return 'Túi thực phẩm đã hết hoặc không còn mở bán. Vui lòng chọn túi khác.';
  if (raw.includes('BAG_NOT_FOUND')) return 'Không tìm thấy túi thực phẩm trong hệ thống.';
  if (raw.includes('STORE_MISMATCH')) return 'Túi thực phẩm không thuộc cửa hàng đã chọn.';
  if (raw.includes('VOUCHER_NOT_FOUND')) return 'Mã giảm giá không tồn tại.';
  if (raw.includes('VOUCHER_ALREADY_USED')) return 'Bạn đã dùng mã giảm giá này cho đơn khác.';
  if (raw.includes('VOUCHER_EXPIRED')) return 'Mã giảm giá đã hết hạn sử dụng.';
  if (raw.includes('VOUCHER_USAGE_LIMIT')) return 'Mã giảm giá đã hết lượt sử dụng.';
  if (raw.includes('VOUCHER_INACTIVE')) return 'Mã giảm giá không còn hiệu lực.';
  return 'Không thể tạo đơn hàng. Vui lòng kiểm tra lại rồi thử lại.';
};

const normalizeCategory = (cat?: string | null): Exclude<FoodCategory, 'all'> => {
  if (!cat) return 'vegetarian';
  const c = cat.toLowerCase().trim();
  if (c === 'bakery' || c.includes('bánh')) return 'bakery';
  if (c === 'meat' || c.includes('mặn') || c.includes('thịt')) return 'meat';
  if (c === 'beverage' || c.includes('uống') || c.includes('nước') || c.includes('cà phê')) return 'beverage';
  if (c === 'vegetarian' || c === 'raw_food' || c.includes('chay') || c.includes('rau') || c.includes('quả') || c.includes('salad')) return 'vegetarian';
  return 'other';
};

let inFlightHomePromise: Promise<any> | null = null;
let lastHomeCoordsKey = '';

export const customerService = {
  getStaticHome() {
    return {
      banners: HOME_BANNERS,
      categories: HOME_CATEGORIES,
      brands: [],
      merchants: [],
      bags: [],
    };
  },

  async getHome(coords?: { lat: number; lng: number }) {
    const lat = coords?.lat ?? 21.0535;
    const lng = coords?.lng ?? 105.7820;
    const coordsKey = `${lat.toFixed(3)}_${lng.toFixed(3)}`;

    // Tránh duplicate API calls song song khi cùng vị trí
    if (inFlightHomePromise && lastHomeCoordsKey === coordsKey) {
      return inFlightHomePromise;
    }

    lastHomeCoordsKey = coordsKey;
    inFlightHomePromise = (async () => {
      let remoteStores: Merchant[] = [];
      let remoteBags: SurpriseBag[] = [];

      try {
        // Chạy song song cả truy vấn stores và bags từ Supabase với các cột chọn lọc tối ưu băng thông
        const [rawStores, bagsSource] = await Promise.all([
          (async () => {
            try {
              const { data: directStores, error: storesErr } = await supabase
                .from('stores')
                .select('id, name, description, phone, address, logo_url, banner_url, rating, total_ratings, is_open, open_time, close_time, latitude, longitude')
                .limit(50);
              if (!storesErr && Array.isArray(directStores)) return directStores;

              const { data: storesData } = await supabase.rpc('list_stores_nearby', {
                p_lat: lat,
                p_lng: lng,
                p_radius: 500000,
                p_category: null,
                p_page: 1,
                p_limit: 50,
              });
              return Array.isArray(storesData) ? storesData : [];
            } catch {
              return [];
            }
          })(),

          (async () => {
            try {
              const { data: directBags, error: bagsErr } = await supabase
                .from('surprise_bags')
                .select('id, store_id, name, description, original_price, discount_price, category, image_url, quantity, max_quantity, pickup_start, pickup_end, is_available, expires_at, created_at, stores(id, name, logo_url, banner_url, address, latitude, longitude, rating, total_ratings)')
                .eq('is_available', true)
                .is('deleted_at', null)
                .order('created_at', { ascending: false })
                .limit(50);
              if (!bagsErr && Array.isArray(directBags)) return directBags;

              const { data: nearbyBags } = await supabase.rpc('list_bags_nearby', {
                p_lat: lat,
                p_lng: lng,
                p_radius: 500000,
                p_category: null,
                p_page: 1,
                p_limit: 50,
              });
              return Array.isArray(nearbyBags) ? nearbyBags : [];
            } catch {
              return [];
            }
          })(),
        ]);

      if (rawStores.length > 0) {
        remoteStores = rawStores.map((s: any) => {
          const storeLat = s.latitude != null ? Number(s.latitude) : undefined;
          const storeLng = s.longitude != null ? Number(s.longitude) : undefined;

          let distM = 500;
          if (typeof storeLat === 'number' && typeof storeLng === 'number') {
            const distKm = calculateDistanceKm([lng, lat], [storeLng, storeLat]);
            distM = Math.round(distKm * 1000);
          }

          return {
            id: s.id,
            brandId: s.id,
            name: s.name,
            description: s.description || 'Quán ăn đối tác GoSavingFood',
            phone: s.phone || '+84900000000',
            address: s.address || 'Việt Nam',
            logo: getStoreLogo(s.logo_url),
            banner: getStoreBanner(s.banner_url),
            rating: Number(s.rating) || 4.9,
            totalRatings: Number(s.total_ratings) || 50,
            distance: distM,
            status: 'active' as const,
            isOpen: s.is_open ?? true,
            openingHours: `${s.open_time?.slice(0, 5) || '07:00'} - ${s.close_time?.slice(0, 5) || '20:00'}`,
            latitude: storeLat,
            longitude: storeLng,
          };
        });
      }

      if (bagsSource.length > 0) {
        remoteBags = bagsSource.map((b: any) => ({
          id: b.id,
          merchantId: b.store_id,
          merchantName: b.store_name || b.stores?.name || 'Quán đối tác',
          name: b.name,
          description: b.description || 'Túi cứu trợ thực phẩm xanh',
          originalPrice: Number(b.original_price) || 50000,
          discountPrice: Number(b.discount_price) || 30000,
          category: normalizeCategory(b.category),
          imageUrl: b.image_url || getBagImage(b.name, null),
          quantity: Number(b.quantity) || 5,
          maxQuantity: Number(b.max_quantity) || 2,
          pickupStart: b.pickup_start?.slice(0, 5) || '11:00',
          pickupEnd: b.pickup_end?.slice(0, 5) || '14:00',
          isAvailable: b.is_available ?? true,
          expiresAt: b.expires_at || undefined,
          rating: Number(b.stores?.rating) || 4.9,
          createdAt: b.created_at,
        }));

        remoteBags.sort((a: any, b: any) => {
          if (!a.createdAt || !b.createdAt) return 0;
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        });
      }
    } catch (err) {
      console.warn('Lấy dữ liệu Supabase getHome lỗi:', err);
    }

    // 1. Toàn bộ cửa hàng từ Supabase
    const allStores = [...remoteStores];
    allStores.sort((a, b) => (a.distance ?? 0) - (b.distance ?? 0));

    // 2. Toàn bộ túi mù từ Supabase
    const allBags = remoteBags;

    const brands: Brand[] = allStores.map((m) => ({
      id: m.id,
      name: m.name,
      logo: m.logo,
      description: m.description,
      rating: m.rating,
      totalStores: 1,
      categories: ['Món Chay', 'Thực Dưỡng', 'Healthy'],
      sustainabilityMessage:
        'Đồng hành cùng GoSavingFood giảm lãng phí thực phẩm mỗi ngày.',
    }));

      return {
        banners: HOME_BANNERS,
        categories: HOME_CATEGORIES,
        brands,
        merchants: allStores,
        bags: allBags,
      };
    })();

    try {
      return await inFlightHomePromise;
    } finally {
      inFlightHomePromise = null;
    }
  },

  async getBag(id: string) {
    try {
      const { data } = await supabase
        .from('surprise_bags')
        .select('*, stores(id, name, logo_url, banner_url, address, latitude, longitude, rating, total_ratings)')
        .eq('id', id)
        .eq('is_available', true)
        .is('deleted_at', null)
        .maybeSingle();

      if (data) {
        return {
          id: data.id,
          merchantId: data.store_id,
          merchantName: data.stores?.name || 'Quán đối tác',
          name: data.name,
          description: data.description || '',
          originalPrice: Number(data.original_price),
          discountPrice: Number(data.discount_price),
          category: (data.category as Exclude<FoodCategory, 'all'>) || 'vegetarian',
          imageUrl: data.image_url || getBagImage(data.name, null),
          quantity: Number(data.quantity) || 1,
          maxQuantity: Number(data.max_quantity) || 2,
          pickupStart: data.pickup_start?.slice(0, 5) || '11:00',
          pickupEnd: data.pickup_end?.slice(0, 5) || '14:00',
          isAvailable: data.is_available ?? true,
          expiresAt: data.expires_at || undefined,
          rating: Number(data.stores?.rating) || 4.9,
        } satisfies SurpriseBag;
      }
    } catch (err) {
      console.warn('getBag Supabase lỗi:', err);
    }

    return null;
  },

  async getMerchant(id: string) {
    try {
      const { data: store } = await supabase
        .from('stores')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      const { data: bags } = await supabase
        .from('surprise_bags')
        .select('*')
        .eq('store_id', id)
        .eq('is_available', true)
        .is('deleted_at', null);

      if (store) {
        const merchant: Merchant = {
          id: store.id,
          brandId: store.id,
          name: store.name,
          description: store.description || '',
          phone: store.phone || '',
          address: store.address || '',
          logo: getStoreLogo(store.logo_url),
          banner: getStoreBanner(store.banner_url),
          rating: Number(store.rating) || 4.9,
          totalRatings: Number(store.total_ratings) || 50,
          distance: 500,
          status: 'active',
          isOpen: store.is_open ?? true,
          openingHours: `${store.open_time?.slice(0, 5) || '07:00'} - ${store.close_time?.slice(0, 5) || '20:00'}`,
          latitude: store.latitude != null ? Number(store.latitude) : undefined,
          longitude: store.longitude != null ? Number(store.longitude) : undefined,
        };

        const mappedBags: SurpriseBag[] = (bags || []).map((b: any) => ({
          id: b.id,
          merchantId: b.store_id,
          merchantName: store.name,
          name: b.name,
          description: b.description || '',
          originalPrice: Number(b.original_price),
          discountPrice: Number(b.discount_price),
          category: (b.category as Exclude<FoodCategory, 'all'>) || 'vegetarian',
          imageUrl: b.image_url || getBagImage(b.name, null),
          quantity: Number(b.quantity),
          maxQuantity: Number(b.max_quantity) || 2,
          pickupStart: b.pickup_start?.slice(0, 5) || '11:00',
          pickupEnd: b.pickup_end?.slice(0, 5) || '14:00',
          isAvailable: b.is_available ?? true,
          expiresAt: b.expires_at || undefined,
          rating: Number(store.rating) || 4.9,
        }));

        return { merchant, bags: mappedBags };
      }
    } catch (err) {
      console.warn('getMerchant Supabase lỗi:', err);
    }

    return { merchant: null, bags: [] };
  },

  async getBrand(id: string) {
    const { merchant } = await this.getMerchant(id);
    if (!merchant) return { brand: null, stores: [] };

    const brand: Brand = {
      id: merchant.id,
      name: merchant.name,
      logo: merchant.logo,
      description: merchant.description,
      rating: merchant.rating,
      totalStores: 1,
      categories: ['Món Chay', 'Healthy'],
      sustainabilityMessage: 'Cùng GoSavingFood giảm lãng phí thực phẩm mỗi ngày.',
    };
    return { brand, stores: [merchant] };
  },

  async getOrders(userId?: string): Promise<Order[]> {
    let currentUserId = userId;
    if (!currentUserId) {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      currentUserId = user?.id;
    }

    if (!currentUserId) {
      return [];
    }

    let localOrders: Order[] = [];
    try {
      const key = `gsf_local_orders_${currentUserId}`;
      localOrders = JSON.parse(localStorage.getItem(key) || '[]');
    } catch {}

    try {
      const query = supabase
        .from('orders')
        .select(
          `
          *,
          stores (name, address, phone, logo_url),
          order_items (*)
        `
        )
        .eq('customer_id', currentUserId)
        .order('created_at', { ascending: false });

      const { data, error } = await query;
      if (!error && Array.isArray(data)) {
        const remoteOrders = data.map((o: any) => ({
          id: o.id,
          orderCode: o.order_code || `GSF-${o.id.slice(0, 6).toUpperCase()}`,
          merchantId: o.store_id,
          merchantName: o.stores?.name || 'Quán đối tác',
          items: (o.order_items || []).map((item: any) => ({
            bagId: item.bag_id,
            bagName: item.bag_name || 'Túi cứu trợ thực phẩm',
            quantity: item.quantity,
            unitPrice: item.unit_price,
            totalPrice: item.total_price || item.unit_price * item.quantity,
          })),
          totalOriginalPrice: Number(o.total_original_price) || Number(o.final_amount),
          totalDiscountPrice: Number(o.total_discount_price) || Number(o.final_amount),
          discountAmount: Number(o.discount_amount) || 0,
          finalAmount: Number(o.final_amount) || 0,
          status: o.status === 'picked_up' ? 'completed' : o.status,
          paymentMethod: o.payment_method === 'cash' ? 'payos_vietqr' : (o.payment_method || 'payos_vietqr'),
          paymentStatus: o.payment_status || (o.status === 'pending_payment' ? 'pending' : 'success'),
          pickupTime: o.pickup_time || '11:00 - 14:00',
          pickupAddress: o.stores?.address || 'Hà Nội',
          createdAt: o.created_at,
          paidAt: o.paid_at || undefined,
          completedAt: o.completed_at || undefined,
          cancelledAt: o.cancelled_at || undefined,
          cancelReason: o.cancel_reason || undefined,
          note: o.note || undefined,
          qrCode: o.qr_code || `GSF-ORDER-${o.id}`,
          pickupToken: o.pickup_token || undefined,
          paymentExpiresAt: o.payment_expires_at || undefined,
        }));
        return [...localOrders, ...remoteOrders];
      }
    } catch (err) {
      console.warn('Lấy đơn hàng từ Supabase lỗi:', err);
    }
    return localOrders;
  },

  async getNotifications(): Promise<NotificationItem[]> {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (!error && Array.isArray(data)) {
        return data.map((n: any) => ({
          id: n.id,
          icon: n.icon || 'system',
          title: n.title || 'Thông báo',
          body: n.body || '',
          time: formatRelativeTime(n.created_at),
          read: Boolean(n.is_read),
        }));
      }
      if (error) console.warn('Lấy thông báo từ Supabase lỗi:', error.message);
    } catch (err) {
      console.warn('Lấy thông báo từ Supabase lỗi:', err);
    }
    return [];
  },

  async markAllNotificationsRead(): Promise<boolean> {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return false;
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', user.id)
        .eq('is_read', false);
      if (error) console.warn('Đánh dấu đã đọc thông báo lỗi:', error.message);
      return !error;
    } catch (err) {
      console.warn('Đánh dấu đã đọc thông báo lỗi:', err);
      return false;
    }
  },

  subscribeToCustomerUpdates(
    userId: string,
    onOrderChange: (payload: any) => void,
    onNotificationChange: (payload: any) => void
  ) {
    return supabase
      .channel(`customer-realtime-${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
          filter: `customer_id=eq.${userId}`,
        },
        (payload) => {
          console.log('[Realtime Customer] Order changed:', payload.eventType, (payload.new as any)?.status);
          onOrderChange(payload);
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          console.log('[Realtime Customer] Notification received:', (payload.new as any)?.title);
          onNotificationChange(payload);
        }
      )
      .subscribe((status, err) => {
        if (err) console.warn('[Realtime Customer] Channel subscription error:', err);
        else console.log('[Realtime Customer] Channel status:', status);
      });
  },

  async getVouchers(): Promise<Voucher[]> {
    try {
      const { data, error } = await supabase
        .from('vouchers')
        .select('*')
        .eq('is_active', true);
      if (!error && Array.isArray(data) && data.length > 0) {
        return data.map((v: any) => ({
          id: v.id,
          code: v.code,
          description: v.description || 'Ưu đãi GoSavingFood',
          discountValue: Number(v.discount_value),
          minOrderValue: Number(v.min_order_value) || 0,
          isActive: v.is_active,
        }));
      }
    } catch {
      // Lỗi truy vấn vouchers -> trả rỗng
    }
    return [];
  },

  async searchLocations(query: string, proximity?: [number, number]): Promise<LocationSuggestion[]> {
    const trimmed = query.trim();
    if (!trimmed) return [];

    // 1. Tìm kiếm đồng thời: Cửa hàng đối tác trong DB + Địa điểm từ Mapbox Search Box
    const [storeRes, mapboxResults] = await Promise.all([
      (async () => {
        try {
          return await supabase
            .from('stores')
            .select('id, name, address, latitude, longitude')
            .or(`name.ilike.%${trimmed}%,address.ilike.%${trimmed}%`)
            .limit(3);
        } catch {
          return { data: null };
        }
      })(),
      mapboxService.searchPlaces(trimmed, proximity).catch(() => []),
    ]);


    const storeSuggestions: LocationSuggestion[] = [];
    if (storeRes && 'data' in storeRes && Array.isArray(storeRes.data)) {
      storeRes.data.forEach((s: any) => {
        if (!s.latitude || !s.longitude) return;
        const coords: [number, number] = [Number(s.longitude), Number(s.latitude)];
        let distanceText = 'Quán đối tác';
        if (proximity) {
          const km = calculateDistanceKm(proximity, coords);
          distanceText = formatDistance(km);
        }
        storeSuggestions.push({
          id: `store-${s.id}`,
          name: `🥡 ${s.name}`,
          address: s.address || 'Quán ăn đối tác GoSavingFood',
          distance: distanceText,
          coordinates: coords,
        });
      });
    }

    if (storeSuggestions.length > 0 || mapboxResults.length > 0) {
      return [...storeSuggestions, ...mapboxResults];
    }

    // 2. Fallback qua Supabase Edge Function nếu có
    try {
      const { data, error } = await supabase.functions.invoke('search-location', {
        body: { q: trimmed },
      });
      if (!error && data?.success && Array.isArray(data.data) && data.data.length > 0) {
        return data.data.map((item: any) => ({
          id: item.id || `loc-${Math.random()}`,
          name: item.name || item.address,
          address: item.address || item.name,
          distance: 'Khu vực bạn chọn',
        }));
      }
    } catch (err) {
      console.warn('search-location edge function fallback failed:', err);
    }

    return [];
  },

  /**
   * Lấy danh sách cửa hàng gần nhất theo tọa độ [lat, lng] dùng PostGIS RPC
   */
  async getStoresNearby(coords: { lat: number; lng: number }, radiusMeters = 50000) {
    let remoteStores: any[] = [];
    try {
      const { data, error } = await supabase.rpc('list_stores_nearby', {
        p_lat: coords.lat,
        p_lng: coords.lng,
        p_radius: radiusMeters,
        p_category: null,
        p_page: 1,
        p_limit: 30,
      });

      if (!error && Array.isArray(data)) {
        remoteStores = data.filter((s: any) => s.latitude && s.longitude);
      }
    } catch (err) {
      console.error('[CustomerService] list_stores_nearby failed:', err);
    }

    return remoteStores;
  },

  async getUser(): Promise<User | null> {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return null;

      let dbName = '';
      let dbPhone = '';
      let dbAvatar = '';
      let hasDbUser = false;
      try {
        const { data: dbUser } = await supabase
          .from('users')
          .select('name, phone, avatar_url')
          .eq('id', user.id)
          .maybeSingle();
        if (dbUser) {
          hasDbUser = true;
          dbName = dbUser.name || '';
          dbPhone = dbUser.phone || '';
          dbAvatar = dbUser.avatar_url || '';
        }
      } catch {
        // Bỏ qua lỗi truy vấn phụ, dùng metadata
      }

      const meta = user.user_metadata || {};
      const fallbackName =
        meta.full_name || meta.name || user.email?.split('@')[0] || 'Khách hàng';
      const fallbackAvatar =
        meta.avatar_url || meta.picture || meta.avatar || undefined;

      if (!hasDbUser) {
        try {
          await supabase.from('users').upsert(
            {
              id: user.id,
              email: user.email,
              name: fallbackName,
              phone: meta.phone || null,
              avatar_url: fallbackAvatar || null,
              role: 'customer',
            },
            { onConflict: 'id' }
          );
        } catch {
          // Bỏ qua lỗi DB nếu trigger đã tự xử lý
        }
      }

      return {
        id: user.id,
        name: dbName || fallbackName,
        phone: dbPhone || meta.phone || '',
        email: user.email,
        avatar: dbAvatar || fallbackAvatar,
      };
    } catch {
      return null;
    }
  },

  async loginWithGoogle() {
    const basePath = import.meta.env.BASE_URL || '/explore/';
    const normalizedBase = basePath.endsWith('/') ? basePath : `${basePath}/`;
    const redirectUrl = new URL(normalizedBase, window.location.origin).toString();

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: redirectUrl,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    });

    if (error) {
      throw new Error(error.message || 'Không thể đăng nhập bằng tài khoản Google.');
    }

    return data;
  },

  async login(identifier: string, password?: string) {
    const parsed = parseIdentifier(identifier);
    if (parsed.type === 'invalid') {
      throw new Error(parsed.errorMessage || 'Email hoặc số điện thoại không hợp lệ.');
    }

    let email = parsed.type === 'email' ? parsed.normalized : parsed.syntheticEmail!;
    if (parsed.type === 'phone') {
      try {
        const { data: realEmail } = await supabase.rpc('get_email_by_phone', {
          p_phone: parsed.phoneNational || parsed.raw,
        });
        if (realEmail) {
          email = realEmail;
        }
      } catch {
        // Fallback to synthetic email
      }
    }

    const pwd = password || 'Password123!';

    let { data: signInData, error: signInError } =
      await supabase.auth.signInWithPassword({
        email,
        password: pwd,
      });

    // Fallback: nếu tra ra email nhưng đăng nhập lỗi, thử với synthetic email
    if (signInError && parsed.type === 'phone' && email !== parsed.syntheticEmail && parsed.syntheticEmail) {
      const fallback = await supabase.auth.signInWithPassword({
        email: parsed.syntheticEmail,
        password: pwd,
      });
      if (!fallback.error) {
        signInData = fallback.data;
        signInError = null;
      }
    }

    if (signInError) {
      throw new Error(mapSupabaseAuthError(signInError));
    }

    if (signInData.user) {
      const u = signInData.user;
      const meta = u.user_metadata || {};
      const fullUser: User = {
        id: u.id,
        name: meta.full_name || meta.name || u.email?.split('@')[0] || 'Khách hàng',
        phone: meta.phone || (parsed.type === 'phone' ? parsed.phoneNational : ''),
        email: u.email,
        avatar: meta.avatar_url || meta.picture || meta.avatar,
      };

      // Đảm bảo đồng bộ thông tin vào bảng public.users nếu thiếu
      try {
        await supabase.from('users').upsert(
          {
            id: u.id,
            email: u.email,
            name: fullUser.name,
            phone: fullUser.phone || null,
            role: 'customer',
          },
          { onConflict: 'id' }
        );
      } catch {
        // Không chặn tiến trình nếu DB RLS hoặc trigger đã tự xử lý
      }

      return fullUser;
    }

    throw new Error('Đăng nhập không thành công.');
  },

  /**
   * Bước 1 Đăng ký: Nhập thông tin & Supabase gửi mã OTP 6 số về Email
   */
  async registerInit(name: string, email: string, password?: string, phone?: string) {
    const trimmedName = name.trim();
    if (!trimmedName || trimmedName.length < 2) {
      throw new Error('Họ và tên phải có ít nhất 2 ký tự.');
    }

    const trimmedEmail = email.trim().toLowerCase();
    if (!isValidEmail(trimmedEmail)) {
      throw new Error('Địa chỉ email không đúng định dạng (ví dụ: ten@domain.com).');
    }

    let phoneNational = '';
    let phoneE164 = '';
    if (phone && phone.trim()) {
      const parsedPhone = parseIdentifier(phone);
      if (parsedPhone.type !== 'phone') {
        throw new Error(parsedPhone.errorMessage || 'Số điện thoại không đúng định dạng Việt Nam.');
      }
      phoneNational = parsedPhone.phoneNational!;
      phoneE164 = parsedPhone.phoneE164!;
    }

    const pwd = password || 'Password123!';
    if (pwd.length < 6) {
      throw new Error('Mật khẩu phải có ít nhất 6 ký tự.');
    }

    // Đăng ký tài khoản. Supabase sẽ gửi mã xác thực OTP 6 số về email của người dùng
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: trimmedEmail,
      password: pwd,
      options: {
        data: {
          name: trimmedName,
          full_name: trimmedName,
          phone: phoneNational,
          phone_e164: phoneE164,
          role: 'customer',
        },
      },
    });

    if (signUpError) {
      throw new Error(mapSupabaseAuthError(signUpError));
    }

    // Nếu identities rỗng, Supabase báo hiệu email này đã tồn tại trong database
    if (signUpData.user && Array.isArray(signUpData.user.identities) && signUpData.user.identities.length === 0) {
      throw new Error('Tài khoản với email này đã tồn tại trên hệ thống. Vui lòng chuyển sang Đăng nhập.');
    }

    // Nếu Supabase Dashboard đang tắt "Confirm email" (Auto-confirm bật), session được tạo ngay:
    if (signUpData.session && signUpData.user) {
      const u = signUpData.user;
      const fullUser: User = {
        id: u.id,
        name: trimmedName,
        phone: phoneNational || '',
        email: u.email,
        avatar: undefined,
      };

      try {
        await supabase.from('users').upsert(
          {
            id: u.id,
            email: u.email,
            name: trimmedName,
            phone: phoneNational || null,
            role: 'customer',
          },
          { onConflict: 'id' }
        );
      } catch {}

      return { email: trimmedEmail, autoConfirmed: true, user: fullUser };
    }

    // Nếu Supabase bật "Confirm email", Supabase đã gửi mã xác thực token 6 số vào email
    return { email: trimmedEmail, autoConfirmed: false, user: null };
  },

  /**
   * Bước 2 Đăng ký: Xác thực mã OTP 6 số từ Email để hoàn tất tạo tài khoản
   */
  async verifyRegisterOtp(email: string, token: string): Promise<User> {
    const trimmedEmail = email.trim().toLowerCase();
    const trimmedToken = token.trim();

    if (!isValidEmail(trimmedEmail)) {
      throw new Error('Địa chỉ email không hợp lệ.');
    }

    if (!trimmedToken || trimmedToken.length !== 6 || !/^\d{6}$/.test(trimmedToken)) {
      throw new Error('Mã OTP gồm đúng 6 chữ số gửi qua email của bạn.');
    }

    // Thử xác thực với type: 'signup' (mã OTP kích hoạt đăng ký của Supabase)
    let { data, error } = await supabase.auth.verifyOtp({
      email: trimmedEmail,
      token: trimmedToken,
      type: 'signup',
    });

    // Fallback: Nếu project cấu hình email OTP dạng 'email'
    if (error && (error.message.includes('token') || error.message.includes('expired') || error.message.includes('invalid'))) {
      const fallback = await supabase.auth.verifyOtp({
        email: trimmedEmail,
        token: trimmedToken,
        type: 'email',
      });
      if (!fallback.error) {
        data = fallback.data;
        error = null;
      }
    }

    if (error) {
      throw new Error(mapSupabaseAuthError(error));
    }

    if (data?.user) {
      const u = data.user;
      const meta = u.user_metadata || {};
      const fullUser: User = {
        id: u.id,
        name: meta.full_name || meta.name || u.email?.split('@')[0] || 'Khách hàng',
        phone: meta.phone || '',
        email: u.email,
        avatar: meta.avatar_url || meta.picture || meta.avatar,
      };

      try {
        await supabase.from('users').upsert(
          {
            id: u.id,
            email: u.email,
            name: fullUser.name,
            phone: fullUser.phone || null,
            role: 'customer',
          },
          { onConflict: 'id' }
        );
      } catch {
        // Bỏ qua lỗi phụ nếu trigger cơ sở dữ liệu đã tự xử lý
      }

      return fullUser;
    }

    throw new Error('Xác thực OTP không thành công.');
  },

  /**
   * Gửi lại mã xác thực OTP đăng ký vào Email
   */
  async resendRegisterOtp(email: string) {
    const trimmed = email.trim().toLowerCase();
    if (!isValidEmail(trimmed)) {
      throw new Error('Địa chỉ email không hợp lệ.');
    }

    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: trimmed,
    });

    if (error) {
      // Fallback nếu Supabase resend type signup gặp lỗi
      const { error: otpError } = await supabase.auth.signInWithOtp({
        email: trimmed,
        options: { shouldCreateUser: false },
      });
      if (otpError) {
        throw new Error(mapSupabaseAuthError(otpError));
      }
    }

    return true;
  },

  /**
   * Alias tương thích ngược cho hàm register
   */
  async register(name: string, identifier: string, password?: string) {
    return this.registerInit(name, identifier, password);
  },

  /**
   * Cấp độ 2 (Supabase Native Free): Gửi email đặt lại mật khẩu
   */
  async resetPassword(email: string) {
    const trimmed = email.trim().toLowerCase();
    if (!isValidEmail(trimmed)) {
      throw new Error('Vui lòng nhập địa chỉ email hợp lệ để đặt lại mật khẩu.');
    }

    const { error } = await supabase.auth.resetPasswordForEmail(trimmed, {
      redirectTo: window.location.origin,
    });

    if (error) {
      throw new Error(mapSupabaseAuthError(error));
    }

    return true;
  },

  async logout() {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.warn('Đăng xuất lỗi:', err);
    }
  },

  async deleteAccount(userId?: string, identifier?: string): Promise<{ success: boolean; message?: string }> {
    try {
      // 1. Gọi RPC delete_user_account với userId hiện tại
      let res = await supabase.rpc('delete_user_account', userId ? { p_user_id: userId } : {});
      let result = res.data as { success?: boolean; error?: string; message?: string } | null;

      // 2. Nếu RPC bằng ID chưa thành công hoặc không có userId, thử qua identifier (email / phone)
      if ((!result || !result.success) && identifier) {
        const idRes = await supabase.rpc('delete_user_by_identifier', { p_identifier: identifier });
        if (idRes.data && (idRes.data as any).success) {
          result = idRes.data as any;
        }
      }

      // 3. Đăng xuất khỏi Supabase Auth và dọn dẹp bộ nhớ client
      try {
        await supabase.auth.signOut();
      } catch {}

      if (typeof window !== 'undefined') {
        try {
          localStorage.removeItem('gsf_customer_user_cache');
          localStorage.removeItem('gsf_notifications_enabled');
          localStorage.removeItem('gsf_customer_orders');
          localStorage.removeItem('gsf_pending_auth_target');
        } catch {}
      }

      return {
        success: result?.success ?? true,
        message: result?.message || 'Tài khoản đã được xóa vĩnh viễn khỏi hệ thống.',
      };
    } catch (err: any) {
      console.warn('Lỗi khi xóa tài khoản:', err);
      try {
        await supabase.auth.signOut();
      } catch {}
      return { success: false, message: err?.message || 'Không thể xóa tài khoản. Vui lòng thử lại.' };
    }
  },

  async updateOrderNote(orderId: string, note: string) {
    try {
      const { error } = await supabase.rpc('update_order_note', {
        p_order_id: orderId,
        p_note: note,
      });
      if (error) console.warn('Cập nhật ghi chú đơn hàng lỗi:', error.message);
      return !error;
    } catch (err) {
      console.warn('Cập nhật ghi chú đơn hàng lỗi:', err);
      return false;
    }
  },

  async cancelOrder(orderId: string, reason: string) {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return false;

      const { error } = await supabase.rpc('transition_order_status_transaction', {
        p_order_id: orderId,
        p_target_status: 'cancelled',
        p_actor_id: user.id,
        p_actor_role: 'customer',
      });

      if (error) {
        console.warn('Hủy đơn hàng trên hệ thống lỗi:', error.message, error.details);
        return false;
      }

      if (reason.trim()) {
        const { error: reasonError } = await supabase.rpc('set_order_cancel_reason', {
          p_order_id: orderId,
          p_reason: reason.trim(),
        });
        if (reasonError) console.warn('Lưu lý do hủy đơn lỗi:', reasonError.message);
      }

      return true;
    } catch (err) {
      console.warn('Hủy đơn hàng trên hệ thống lỗi:', err);
      return false;
    }
  },

  async submitIssue(orderId: string, title: string, description: string) {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return false;

      const { error } = await supabase.from('issues').insert({
        order_id: orderId,
        reporter_id: user.id,
        reporter_role: 'customer',
        title,
        description: description || null,
      });

      if (error) console.warn('Gửi báo cáo sự cố lỗi:', error.message);
      return !error;
    } catch (err) {
      console.warn('Gửi báo cáo sự cố lỗi:', err);
      return false;
    }
  },
  async createOrder(
    order: Omit<Order, 'id' | 'orderCode' | 'createdAt'>,
    voucherCode?: string,
    customerInfo?: { name?: string; phone?: string }
  ): Promise<Order> {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      throw new Error('Vui lòng đăng nhập trước khi đặt hàng.');
    }

    if (customerInfo?.name?.trim() || customerInfo?.phone?.trim()) {
      try {
        const updates: Record<string, string> = { updated_at: new Date().toISOString() };
        if (customerInfo.name?.trim()) updates.name = customerInfo.name.trim();
        if (customerInfo.phone?.trim()) updates.phone = customerInfo.phone.trim();
        await supabase.from('users').update(updates).eq('id', user.id);
      } catch (err) {
        console.warn('Cập nhật thông tin khách hàng vào bảng users lỗi:', err);
      }
    }

    const orderId = crypto.randomUUID();
    const generatedOrderCode = `GSF-${orderId.slice(0, 6).toUpperCase()}`;
    const qrCodeString = `GSF-ORDER-${generatedOrderCode}-${Date.now()}`;
    const idempotencyKey = crypto.randomUUID();
    const pickupIso = new Date(Date.now() + 3600000).toISOString();

    const isLocalHanoiOrder = order.merchantId.startsWith('store-hn-');
    if (isLocalHanoiOrder) {
      const localOrder: Order = {
        ...order,
        id: orderId,
        orderCode: generatedOrderCode,
        qrCode: qrCodeString,
        status: 'pending',
        paymentStatus: 'pending',
        createdAt: new Date().toISOString(),
      };
      try {
        const key = `gsf_local_orders_${user.id}`;
        const saved = JSON.parse(localStorage.getItem(key) || '[]');
        localStorage.setItem(key, JSON.stringify([localOrder, ...saved]));
      } catch {}
      return localOrder;
    }

    const { data: rpcResult, error } = await supabase.rpc('place_order', {
      p_id: orderId,
      p_store_id: order.merchantId,
      p_idempotency_key: idempotencyKey,
      p_items: order.items.map((item) => ({
        bagId: item.bagId,
        quantity: item.quantity,
      })),
      p_voucher_code: voucherCode || null,
      p_pickup_time: pickupIso,
      p_payment_method: order.paymentMethod,
      p_note: order.note || null,
      p_total_original_price: order.totalOriginalPrice,
      p_total_discount_price: order.totalDiscountPrice,
      p_discount_amount: order.discountAmount,
      p_final_amount: order.finalAmount,
      p_qr_code: qrCodeString,
    });

    if (error) {
      console.warn('Tạo đơn place_order lỗi:', error.message, error.details);
      throw new Error(mapCreateOrderError(error));
    }

    const createdId = (rpcResult as { order_id?: string; pickup_token?: string } | null)?.order_id || orderId;
    const pickupToken = (rpcResult as { pickup_token?: string } | null)?.pickup_token;

    return {
      ...order,
      id: createdId,
      orderCode: generatedOrderCode,
      qrCode: qrCodeString,
      pickupToken: pickupToken || undefined,
      paymentExpiresAt: new Date(Date.now() + 15 * 60000).toISOString(),
      status: 'pending_payment',
      paymentStatus: 'pending',
      createdAt: new Date().toISOString(),
    };
  },

  async cleanupExpiredPendingOrders(): Promise<number> {
    try {
      const { data } = await supabase.rpc('cleanup_expired_pending_orders');
      return (data as any)?.expired_orders_count || 0;
    } catch (err) {
      console.warn('cleanupExpiredPendingOrders error:', err);
      return 0;
    }
  },

  async submitFeedback(
    orderId: string,
    storeId: string,
    rating: number,
    comment: string
  ) {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      await supabase.from('reviews').insert({
        order_id: orderId,
        customer_id: user?.id,
        store_id: storeId,
        rating,
        comment,
      });
      return true;
    } catch {
      return false;
    }
  },
  async createPayOSPayment(params: {
    orderId: string;
    amount: number;
    description?: string;
    items?: Array<{ name: string; quantity: number; price: number }>;
  }): Promise<{
    success: boolean;
    orderCode: number;
    paymentLinkId: string;
    checkoutUrl: string;
    qrCode: string;
    accountNumber: string;
    accountName: string;
    bin: string;
    amount: number;
    description: string;
  } | null> {
    try {
      const apiBase =
        import.meta.env.VITE_API_URL ||
        (import.meta.env.PROD ? 'https://gosavingfood.app' : '');
      const res = await fetch(`${apiBase}/api/payos/create-payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });
      if (!res.ok) {
        console.warn('[customerService] PayOS create-payment returned non-200:', res.status);
        return null;
      }
      const data = await res.json();
      if (data.success) {
        return data;
      }
      return null;
    } catch (err) {
      console.warn('[customerService] createPayOSPayment error:', err);
      return null;
    }
  },

  async checkPayOSStatus(orderCode: number): Promise<{ paid: boolean; status: string } | null> {
    try {
      const apiBase =
        import.meta.env.VITE_API_URL ||
        (import.meta.env.PROD ? 'https://gosavingfood.app' : '');
      const res = await fetch(`${apiBase}/api/payos/check-status?orderCode=${orderCode}`);
      if (!res.ok) return null;
      const data = await res.json();
      return data;
    } catch {
      return null;
    }
  },
};
