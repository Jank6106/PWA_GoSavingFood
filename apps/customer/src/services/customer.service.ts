import {
  mockBanners,
  mockBrands,
  mockCategories,
  mockLocations,
  mockNotifications,
  mockOrders,
  mockUser,
  mockVouchers,
} from './customer.mock';
import { supabase } from './supabase';
import type {
  Brand,
  FoodCategory,
  LocationSuggestion,
  Merchant,
  Order,
  SurpriseBag,
  User,
  Voucher,
} from '../shared/types/customer.types';

const delay = (milliseconds = 100) =>
  new Promise<void>((resolve) => window.setTimeout(resolve, milliseconds));

const getBagImage = (name: string, url?: string | null) => {
  if (url && url.startsWith('http')) return url;
  const n = (name || '').toLowerCase();
  if (n.includes('salad'))
    return 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=600';
  if (n.includes('nước ép') || n.includes('thơm') || n.includes('uống'))
    return 'https://images.unsplash.com/photo-1613478223719-2ab802602423?w=600';
  if (n.includes('trái cây') || n.includes('hoa quả'))
    return 'https://images.unsplash.com/photo-1619566636858-adf3ef46400b?w=600';
  if (n.includes('bánh'))
    return 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=600';
  return 'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=600';
};

const getStoreLogo = (url?: string | null) =>
  (url && url.startsWith('http'))
    ? url
    : 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=200';

const getStoreBanner = (url?: string | null) =>
  (url && url.startsWith('http'))
    ? url
    : 'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=800';

export const customerService = {
  async getHome(coords?: { lat: number; lng: number }) {
    const lat = coords?.lat ?? 10.7798;
    const lng = coords?.lng ?? 106.7032;

    let remoteStores: Merchant[] = [];
    let remoteBags: SurpriseBag[] = [];

    try {
      // 1. Lấy danh sách quán từ Supabase (list_stores_nearby hoặc bảng stores trực tiếp)
      let rawStores: any[] = [];
      const { data: storesData } = await supabase.rpc('list_stores_nearby', {
        p_lat: lat,
        p_lng: lng,
        p_radius: 50000,
        p_category: null,
        p_page: 1,
        p_limit: 20,
      });

      if (Array.isArray(storesData) && storesData.length > 0) {
        rawStores = storesData;
      } else {
        const { data: directStores } = await supabase.from('stores').select('*');
        if (Array.isArray(directStores)) {
          rawStores = directStores;
        }
      }

      if (rawStores.length > 0) {
        remoteStores = rawStores.map((s: any) => ({
          id: s.id,
          brandId: s.id,
          name: s.name,
          description: s.description || 'Quán ăn đối tác GoSavingFood',
          phone: s.phone || '+84900000000',
          address: s.address || 'Hồ Chí Minh',
          logo: getStoreLogo(s.logo_url),
          banner: getStoreBanner(s.banner_url),
          rating: Number(s.rating) || 4.9,
          totalRatings: Number(s.total_ratings) || 50,
          distance: s.distance_m ? Math.round(s.distance_m / 100) / 10 : 0.5,
          status: 'active' as const,
          isOpen: s.is_open ?? true,
          openingHours: `${s.open_time?.slice(0, 5) || '07:00'} - ${s.close_time?.slice(0, 5) || '20:00'}`,
        }));
      }

      // 2. Lấy túi mù từ RPC list_bags_nearby hoặc trực tiếp bảng surprise_bags
      let bagsSource: any[] = [];
      const { data: nearbyBags } = await supabase.rpc('list_bags_nearby', {
        p_lat: lat,
        p_lng: lng,
        p_radius: 50000,
        p_category: null,
        p_page: 1,
        p_limit: 20,
      });

      if (Array.isArray(nearbyBags) && nearbyBags.length > 0) {
        bagsSource = nearbyBags;
      } else {
        const { data: directBags } = await supabase
          .from('surprise_bags')
          .select('*, stores(name, logo_url, address)')
          .limit(20);
        if (Array.isArray(directBags)) {
          bagsSource = directBags;
        }
      }

      if (bagsSource.length > 0) {
        remoteBags = bagsSource.map((b: any) => ({
          id: b.id,
          merchantId: b.store_id,
          merchantName: b.store_name || b.stores?.name || 'Quán Chay Quýt',
          name: b.name,
          description: b.description || 'Túi cứu trợ thực phẩm xanh',
          originalPrice: Number(b.original_price) || 50000,
          discountPrice: Number(b.discount_price) || 30000,
          category: (b.category as Exclude<FoodCategory, 'all'>) || 'vegetarian',
          imageUrl: getBagImage(b.name, b.image_url),
          quantity: Number(b.quantity) || 5,
          maxQuantity: Number(b.max_quantity) || 2,
          pickupStart: b.pickup_start?.slice(0, 5) || '11:00',
          pickupEnd: b.pickup_end?.slice(0, 5) || '14:00',
          isAvailable: b.is_available ?? true,
          expiresAt: b.expires_at || new Date(Date.now() + 86400000 * 7).toISOString(),
          rating: 4.9,
        }));
      }
    } catch (err) {
      console.warn('Lấy dữ liệu Supabase getHome lỗi:', err);
    }

    // Nếu database đã có dữ liệu thực tế -> DÙNG 100% DỮ LIỆU TỪ DATABASE
    const merchants = remoteStores.length > 0 ? remoteStores : [];
    const bags = remoteBags.length > 0 ? remoteBags : [];

    const brands: Brand[] =
      merchants.length > 0
        ? merchants.map((m) => ({
            id: m.id,
            name: m.name,
            logo: m.logo,
            description: m.description,
            rating: m.rating,
            totalStores: 1,
            categories: ['Món Chay', 'Thực Dưỡng', 'Healthy'],
            sustainabilityMessage:
              'Đồng hành cùng GoSavingFood giảm lãng phí thực phẩm mỗi ngày.',
          }))
        : mockBrands;

    return {
      banners: mockBanners,
      categories: mockCategories,
      brands,
      merchants,
      bags,
    };
  },

  async getBag(id: string) {
    try {
      const { data } = await supabase
        .from('surprise_bags')
        .select('*, stores(name, logo_url, address)')
        .eq('id', id)
        .maybeSingle();

      if (data) {
        return {
          id: data.id,
          merchantId: data.store_id,
          merchantName: data.stores?.name || 'Quán Chay Quýt',
          name: data.name,
          description: data.description || '',
          originalPrice: Number(data.original_price),
          discountPrice: Number(data.discount_price),
          category: (data.category as Exclude<FoodCategory, 'all'>) || 'vegetarian',
          imageUrl: getBagImage(data.name, data.image_url),
          quantity: Number(data.quantity) || 1,
          maxQuantity: Number(data.max_quantity) || 2,
          pickupStart: data.pickup_start?.slice(0, 5) || '11:00',
          pickupEnd: data.pickup_end?.slice(0, 5) || '14:00',
          isAvailable: data.is_available ?? true,
          expiresAt: data.expires_at,
          rating: 4.9,
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
        .eq('store_id', id);

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
          distance: 0.5,
          status: 'active',
          isOpen: store.is_open ?? true,
          openingHours: `${store.open_time?.slice(0, 5) || '07:00'} - ${store.close_time?.slice(0, 5) || '20:00'}`,
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
          imageUrl: getBagImage(b.name, b.image_url),
          quantity: Number(b.quantity),
          maxQuantity: Number(b.max_quantity) || 2,
          pickupStart: b.pickup_start?.slice(0, 5) || '11:00',
          pickupEnd: b.pickup_end?.slice(0, 5) || '14:00',
          isAvailable: b.is_available ?? true,
          expiresAt: b.expires_at,
          rating: 4.9,
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

  async getOrders(): Promise<Order[]> {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const query = supabase
        .from('orders')
        .select(
          `
          *,
          stores (name, address, phone, logo_url),
          order_items (*)
        `
        )
        .order('created_at', { ascending: false });

      if (user) {
        query.eq('customer_id', user.id);
      }

      const { data, error } = await query;
      if (!error && Array.isArray(data) && data.length > 0) {
        return data.map((o: any) => ({
          id: o.id,
          orderCode: o.order_code || `GSF-${o.id.slice(0, 6).toUpperCase()}`,
          merchantId: o.store_id,
          merchantName: o.stores?.name || 'Quán Chay Quýt',
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
          status: o.status,
          paymentMethod: o.payment_method || 'cash',
          paymentStatus: o.payment_status || (o.status === 'pending' ? 'pending' : 'success'),
          pickupTime: o.pickup_time || '11:00 - 14:00',
          pickupAddress: o.stores?.address || '456 Lê Lợi, Q1, TP.HCM',
          createdAt: o.created_at,
          paidAt: o.paid_at || undefined,
          completedAt: o.completed_at || undefined,
          cancelledAt: o.cancelled_at || undefined,
          cancelReason: o.cancel_reason || undefined,
          note: o.note || undefined,
          qrCode: o.qr_code || `GSF-ORDER-${o.id}`,
        }));
      }
    } catch (err) {
      console.warn('Lấy đơn hàng từ Supabase lỗi:', err);
    }
    return [...mockOrders];
  },

  async getNotifications() {
    await delay();
    return [...mockNotifications];
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
      // Fallback
    }
    return [...mockVouchers];
  },

  async searchLocations(query: string): Promise<LocationSuggestion[]> {
    const trimmed = query.trim();
    if (!trimmed) return [...mockLocations];

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
      console.warn('search-location edge function failed, using mock:', err);
    }

    const normalized = trimmed.toLocaleLowerCase('vi-VN');
    return mockLocations.filter((location) =>
      `${location.name} ${location.address}`
        .toLocaleLowerCase('vi-VN')
        .includes(normalized)
    );
  },

  async getUser(): Promise<User | null> {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return null;
      return {
        id: user.id,
        name: user.user_metadata?.name || user.email?.split('@')[0] || 'Khách hàng',
        phone: user.user_metadata?.phone || '0901234567',
        email: user.email,
        avatar: user.user_metadata?.avatar,
      };
    } catch {
      return null;
    }
  },

  async login(emailOrPhone: string, password?: string, name?: string) {
    const isEmail = emailOrPhone.includes('@');
    const email = isEmail ? emailOrPhone.trim() : `${emailOrPhone.trim()}@gosavingfood.vn`;
    const pwd = password || 'Password123!';

    try {
      const { data: signInData, error: signInError } =
        await supabase.auth.signInWithPassword({
          email,
          password: pwd,
        });

      if (!signInError && signInData.user) {
        const u = signInData.user;
        return {
          id: u.id,
          name: u.user_metadata?.name || name || u.email?.split('@')[0] || 'Khách hàng',
          phone: u.user_metadata?.phone || emailOrPhone,
          email: u.email,
        } satisfies User;
      }

      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email,
        password: pwd,
        options: {
          data: {
            name: name || 'Khách hàng mới',
            phone: emailOrPhone,
            role: 'customer',
          },
        },
      });

      if (!signUpError && signUpData.user) {
        const u = signUpData.user;
        return {
          id: u.id,
          name: u.user_metadata?.name || name || 'Khách hàng mới',
          phone: emailOrPhone,
          email: u.email,
        } satisfies User;
      }
    } catch (err) {
      console.warn('Supabase auth error:', err);
    }

    return { ...mockUser, name: name || mockUser.name, phone: emailOrPhone };
  },

  async logout() {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.warn('Đăng xuất lỗi:', err);
    }
  },

  async updateOrderNote(orderId: string, note: string) {
    try {
      const { error } = await supabase.from('orders').update({ note }).eq('id', orderId);
      return !error;
    } catch (err) {
      console.warn('Cập nhật ghi chú đơn hàng lỗi:', err);
      return false;
    }
  },

  async cancelOrder(orderId: string, reason: string) {
    try {
      const { error } = await supabase
        .from('orders')
        .update({
          status: 'cancelled',
          cancel_reason: reason,
          cancelled_at: new Date().toISOString(),
        })
        .eq('id', orderId);
      return !error;
    } catch (err) {
      console.warn('Hủy đơn hàng trên hệ thống lỗi:', err);
      return false;
    }
  },
  async createOrder(
    order: Omit<Order, 'id' | 'orderCode' | 'createdAt'>,
    voucherCode?: string
  ): Promise<Order> {
    const tempId = `order-${Date.now()}`;
    const generatedOrderCode = `GSF-${Math.floor(100000 + Math.random() * 900000)}`;
    const qrCodeString = `GSF-ORDER-${generatedOrderCode}-${tempId}`;

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const idempotencyKey = crypto.randomUUID();
      const pickupIso = new Date(Date.now() + 3600000).toISOString();

      const { data: rpcOrder, error } = await supabase.rpc(
        'create_order_transaction',
        {
          p_customer_id: user?.id || 'a0000000-0000-0000-0000-000000000001',
          p_store_id: order.merchantId,
          p_items: order.items.map((i) => ({
            bag_id: i.bagId,
            quantity: i.quantity,
          })),
          p_idempotency_key: idempotencyKey,
          p_pickup_time: pickupIso,
          p_payment_method: order.paymentMethod,
          p_voucher_code: voucherCode || null,
        }
      );

      if (!error && rpcOrder) {
        return {
          ...order,
          id: rpcOrder.id || tempId,
          orderCode: rpcOrder.order_code || generatedOrderCode,
          qrCode: rpcOrder.qr_code || qrCodeString,
          createdAt: rpcOrder.created_at || new Date().toISOString(),
        };
      }
    } catch (err) {
      console.warn('Tạo đơn Supabase create_order_transaction lỗi:', err);
    }

    return {
      ...order,
      id: tempId,
      orderCode: generatedOrderCode,
      qrCode: qrCodeString,
      createdAt: new Date().toISOString(),
    };
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
};
