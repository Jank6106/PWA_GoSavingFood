# Hướng Dẫn Tích Hợp Mapbox Cho GoSavingFood (GSF)

Tài liệu này quy định kiến trúc và hướng dẫn chi tiết cách frontend (Web / Mobile) tích hợp **Mapbox** kết hợp với **Supabase PostgreSQL + PostGIS**.

---

## 1. Nguyên Tắc Kiến Trúc Cốt Lõi (Architecture Rule)

```
                  GSF CLIENT (Web / Mobile)
                             │
          ┌──────────────────┼──────────────────┐
          ▼                  ▼                  ▼
       Mapbox             Supabase           Supabase
       Map UI             Data API        Edge Functions
          │                  │                  │
   (Tiles & Render)          ▼                  ▼
          │              PostgreSQL       External APIs
          │              + PostGIS        (Mapbox v6 API)
          │                  │
          └──────────────────┼──────────────────┘
                             ▼
              Store & Bag Map Markers + Nearby List
```

### Phân Định Trách Nhiệm Rõ Ràng:

| Thành Phần | Trách Nhiệm | KHÔNG Được Làm |
|---|---|---|
| **Supabase PostgreSQL + PostGIS** | **Nguồn chân lý duy nhất (Single Source of Truth)** về tọa độ quán, tính khoảng cách, bán kính quét, lọc theo danh mục, sắp xếp từ gần đến xa. | Không dùng Mapbox Search để tìm quán quanh đây. |
| **Mapbox** | Hiển thị bản đồ (vector tiles/styles), tương tác vuốt/phóng to thu nhỏ, vẽ marker, forward/reverse geocoding phụ trợ. | Không lưu trữ hay quản lý danh mục túi đồ ăn/tồn kho. |
| **PostGIS RPCs** | `list_stores_nearby`, `list_bags_nearby` là 2 hàm nguyên tử chịu trách nhiệm truy vấn không gian. | Không thay thế PostGIS RPC bằng Mapbox Tilequery. |

---

## 2. Chuẩn Dữ Liệu Tọa Độ (Location Contract)

> [!IMPORTANT]
> **Quy tắc vàng về thứ tự tọa độ:**
> - Trong cơ sở dữ liệu Supabase, SDK, và logic ứng dụng: `{ latitude: number, longitude: number }`.
> - Trong Mapbox và GeoJSON: `[longitude, latitude]` (kinh độ trước, vĩ độ sau).

### Bộ chuyển đổi trong SDK (`src/client/supabase/location.ts`):
```typescript
import { toLngLat, fromLngLat } from '@/client/supabase';

// Chuyển sang Mapbox format
const mapboxCoords = toLngLat({ latitude: 10.7725, longitude: 106.6980 });
// => [106.6980, 10.7725]

// Chuyển từ Mapbox click event về App format
const appCoords = fromLngLat([106.6980, 10.7725]);
// => { latitude: 10.7725, longitude: 106.6980 }
```

---

## 3. Cài Đặt (Installation)

### Dành cho Web (React / Next.js / Vite):
```bash
npm install mapbox-gl
npm install -D @types/mapbox-gl
```

### Dành cho Mobile (React Native / Expo):
```bash
npx expo install @rnmapbox/maps
```

---

## 4. Cấu Hình Biến Môi Trường (Environment Variables)

Sử dụng public token (`pk.`):

```env
# Tiêu chuẩn chung
MAPBOX_PUBLIC_TOKEN=pk.eyJ1IjoieW91ci11c2VyIiwiYSI6ImNteHh4eCJ9.xxxx

# Nếu sử dụng Next.js:
NEXT_PUBLIC_MAPBOX_TOKEN=pk.eyJ1IjoieW91ci11c2VyIiwiYSI6ImNteHh4eCJ9.xxxx

# Nếu sử dụng Vite:
VITE_MAPBOX_TOKEN=pk.eyJ1IjoieW91ci11c2VyIiwiYSI6ImNteHh4eCJ9.xxxx

# Nếu sử dụng Expo / React Native:
EXPO_PUBLIC_MAPBOX_TOKEN=pk.eyJ1IjoieW91ci11c2VyIiwiYSI6ImNteHh4eCJ9.xxxx
```

> [!CAUTION]
> **Bảo mật:**
> - Tuyệt đối không commit token vào Git.
> - Trên môi trường Production của Mapbox Dashboard, hãy cấu hình **URL Restrictions** (ví dụ: `https://gosavingfood.com/*`) để tránh bị sao chép token sử dụng trái phép.

---

## 5. Khởi Tạo Bản Đồ (Map Initialization)

```typescript
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || process.env.VITE_MAPBOX_TOKEN!;

const map = new mapboxgl.Map({
  container: 'map-container', // ID của thẻ div
  style: 'mapbox://styles/mapbox/streets-v12', // Style chuẩn
  center: [106.6980, 10.7725], // [lng, lat] TP. Hồ Chí Minh
  zoom: 13,
});

// Thêm thanh điều hướng (zoom, xoay la bàn)
map.addControl(new mapboxgl.NavigationControl(), 'top-right');
```

---

## 6. Luồng Tải Dữ Liệu & Hiển Thị Marker

### 6.1. Lấy vị trí người dùng
```typescript
navigator.geolocation.getCurrentPosition(
  async (position) => {
    const userLocation = {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
    };
    
    // Đưa bản đồ về tâm vị trí người dùng
    map.flyTo({ center: [userLocation.longitude, userLocation.latitude], zoom: 14 });
    
    // Gọi Supabase PostGIS để lấy túi đồ ăn
    loadNearbyBags(userLocation);
  },
  (error) => {
    console.error('Không thể lấy vị trí người dùng:', error.message);
  },
  { enableHighAccuracy: true, timeout: 10000 }
);
```

### 6.2. Truy vấn danh sách túi gần nhất qua Supabase SDK
```typescript
import { gsf } from '@/client/supabase';

async function loadNearbyBags(location: { latitude: number; longitude: number }) {
  const { bags } = await gsf.bags.listNearby({
    latitude: location.latitude,
    longitude: location.longitude,
    radiusMeters: 5000, // Quét trong bán kính 5km
  });

  renderStoreMarkers(bags);
}
```

### 6.3. Vẽ Marker đại diện cho Cửa Hàng (Store-level Clustering)
Tránh vẽ quá nhiều marker trùng lặp nếu 1 cửa hàng có nhiều túi đồ ăn khác nhau. Gom nhóm các túi theo `storeId`:

```typescript
function renderStoreMarkers(bags: Array<any>) {
  // 1. Gom nhóm túi theo cửa hàng
  const storesMap = new Map();
  for (const bag of bags) {
    if (!storesMap.has(bag.storeId)) {
      storesMap.set(bag.storeId, {
        storeId: bag.storeId,
        storeName: bag.storeName,
        storeAddress: bag.storeAddress,
        latitude: bag.latitude,
        longitude: bag.longitude,
        distanceMeters: bag.distanceMeters,
        bags: [],
      });
    }
    storesMap.get(bag.storeId).bags.push(bag);
  }

  // 2. Tạo Marker trên Mapbox
  storesMap.forEach((store) => {
    const el = document.createElement('div');
    el.className = 'gsf-store-marker';
    el.innerHTML = `
      <div style="background:#10b981;color:white;padding:6px 10px;border-radius:20px;font-weight:bold;box-shadow:0 2px 6px rgba(0,0,0,0.2);cursor:pointer;">
        🥡 ${store.bags.length} túi
      </div>
    `;

    const popup = new mapboxgl.Popup({ offset: 25 }).setHTML(`
      <div style="font-family:sans-serif;padding:6px;">
        <h4 style="margin:0 0 4px 0;">${store.storeName}</h4>
        <p style="margin:0 0 6px 0;font-size:12px;color:#666;">${store.storeAddress}</p>
        <p style="margin:0;font-size:12px;font-weight:bold;color:#10b981;">Khoảng cách: ${(store.distanceMeters / 1000).toFixed(1)} km</p>
      </div>
    `);

    new mapboxgl.Marker(el)
      .setLngLat([store.longitude, store.latitude]) // [lng, lat]
      .setPopup(popup)
      .addTo(map);

    el.addEventListener('click', () => {
      highlightStoreCard(store.storeId);
    });
  });
}
```

---

## 7. Đồng Bộ Giữa Bản Đồ và Danh Sách (Map/List Synchronization)

```
┌───────────────────────────────────────────────┐
│                    MAPBOX                     │
│           [Marker A]        [Marker B]        │
└───────────────────────┬───────────────────────┘
                        │ Click Marker A
                        ▼
               Highlight Card Store A
                        ▲
                        │ Click Card Store B
┌───────────────────────┴───────────────────────┐
│ Danh sách túi:                                │
│ [Card Store A]                                │
│ [Card Store B] ──> map.flyTo([storeB.lng, lat])│
└───────────────────────────────────────────────┘
```

1. **Khi người dùng bấm vào Marker trên bản đồ**:
   - Scroll đến thẻ cửa hàng tương ứng trong danh sách:
   ```typescript
   document.getElementById(`store-card-${storeId}`)?.scrollIntoView({ behavior: 'smooth' });
   ```
2. **Khi người dùng bấm vào thẻ cửa hàng / túi đồ ăn trong danh sách**:
   - Di chuyển tâm bản đồ đến tọa độ quán:
   ```typescript
   map.flyTo({
     center: [store.longitude, store.latitude],
     zoom: 15,
     essential: true,
   });
   ```
3. **Nút "Tìm khu vực này" ("Search this area")**:
   - Khi người dùng kéo bản đồ sang khu vực khác, lấy tâm bản đồ hiện tại và gọi lại RPC:
   ```typescript
   const center = map.getCenter();
   loadNearbyBags({ latitude: center.lat, longitude: center.lng });
   ```

---

## 8. Geocoding & Reverse Geocoding (Tạo/Sửa Cửa Hàng)

Khi Merchant tạo cửa hàng mới hoặc tìm kiếm địa chỉ, ứng dụng có thể sử dụng hàm SDK gọi qua Edge Function `geocode-location` (sử dụng Mapbox Geocoding v6 API):

### 8.1. Forward Geocoding (Tìm tọa độ từ địa chỉ nhập vào):
```typescript
import { gsf } from '@/client/supabase';

// Merchant nhập địa chỉ text
const result = await gsf.location.geocode('Landmark 81, Ho Chi Minh City');
console.log(result);
// => {
//   latitude: 10.7950,
//   longitude: 106.7218,
//   formattedAddress: "Landmark 81, 720A Điện Biên Phủ, Phường 22, Bình Thạnh, TP. Hồ Chí Minh",
//   provider: "mapbox"
// }

// Lưu vào Supabase stores table:
await gsf.stores.createStore(merchantUserId, {
  name: "Tiệm Bánh Landmark",
  phone: "+84901234567",
  address: result.formattedAddress,
  latitude: result.latitude,
  longitude: result.longitude,
});
```

### 8.2. Reverse Geocoding (Lấy địa chỉ từ ghim tọa độ):
```typescript
const addressResult = await gsf.location.reverseGeocode({
  latitude: 10.7725,
  longitude: 106.6980,
});
console.log(addressResult.formattedAddress);
// => "Chợ Bến Thành, Đường Lê Lợi, Phường Bến Thành, Quận 1, TP. Hồ Chí Minh"
```

> [!NOTE]
> **Mapbox v6 Permanent Geocoding:**
> Nếu tọa độ được lưu trữ lâu dài vào cơ sở dữ liệu (`stores.location`), tham số `permanent: true` được kích hoạt để tuân thủ điều khoản Mapbox Terms of Service.

---

## 9. Xử Lý Lỗi & Ngoại Lệ (Error Handling)

| Tình Huống | Biểu Hiện | Cách Xử Lý |
|---|---|---|
| **Từ chối quyền vị trí (Permission Denied)** | `error.code === 1` | Hiển thị thông báo thân thiện: *"Vui lòng cấp quyền truy cập vị trí để xem túi đồ ăn quanh bạn, hoặc chọn khu vực mặc định (Quận 1, TP.HCM)"*. |
| **Không có túi nào quanh bán kính (Zero Results)** | `bags.length === 0` | Hiển thị empty state: *"Hiện chưa có quán nào quanh bạn trong bán kính 5km. Hãy thử mở rộng bán kính lên 10km hoặc quay lại vào buổi chiều tối."* |
| **Thiếu Mapbox Token** | Mapbox lỗi 401 | Hiển thị thông báo cấu hình môi trường thiếu `MAPBOX_PUBLIC_TOKEN`. |
| **Lỗi mạng / Ngoại tuyến** | Fetch failed | Sử dụng offline cache hoặc hiển thị nút "Thử lại". |

---

## 10. Tích Hợp Mobile (React Native / Expo)

Trên Mobile, Mapbox sử dụng thư viện `@rnmapbox/maps`:

```tsx
import Mapbox from '@rnmapbox/maps';
import { View, StyleSheet } from 'react-native';

Mapbox.setAccessToken(process.env.EXPO_PUBLIC_MAPBOX_TOKEN);

export function StoreMap({ stores, onSelectStore }) {
  return (
    <View style={styles.container}>
      <Mapbox.MapView style={styles.map}>
        <Mapbox.Camera
          zoomLevel={13}
          centerCoordinate={[106.6980, 10.7725]}
        />
        <Mapbox.UserLocation visible={true} />
        {stores.map((store) => (
          <Mapbox.PointAnnotation
            key={store.id}
            id={store.id}
            coordinate={[store.longitude, store.latitude]}
            onSelected={() => onSelectStore(store)}
          />
        ))}
      </Mapbox.MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },
});
```

---

## 11. Checklist Kiểm Tra Production

- [x] Biến `MAPBOX_PUBLIC_TOKEN` được khai báo trong `.env.example`.
- [x] Đã thiết lập URL restrictions trong Mapbox Console cho domain production.
- [x] Tọa độ truyền vào Mapbox Marker tuân thủ đúng thứ tự `[longitude, latitude]`.
- [x] Tọa độ lưu vào Supabase PostGIS tuân thủ đúng định dạng `POINT(lng lat)`.
- [x] PostGIS RPCs (`list_stores_nearby`, `list_bags_nearby`) trả về đầy đủ `latitude`, `longitude`, `distance_m`.
- [x] Edge Function `geocode-location` hoạt động và đã triển khai trên Supabase Cloud.
- [x] 100% tests kiểm thử vị trí và PostGIS pass thành công.
