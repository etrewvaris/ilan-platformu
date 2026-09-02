# İlan Platformu (Sahibinden.com Tarzı)

## Klasör Yapısı
```
ilan-platformu/
├── database/schema.sql          # PostgreSQL şeması (JSONB attributes + GIN index)
├── backend/                     # Node.js/Express API
│   ├── config/db.js
│   ├── validators/listingValidator.js
│   ├── routes/listings.js       # POST /, GET /:id, GET / (JSONB filtreleme)
│   ├── routes/categories.js
│   └── server.js
├── frontend/                    # Next.js
│   ├── lib/api.js
│   ├── components/FilterPanel.jsx
│   ├── components/ListingCard.jsx
│   └── pages/ilanlar/index.js
└── flutter/                     # Flutter mobil uygulama
    ├── lib/models/listing.dart
    ├── lib/services/api_service.dart
    └── lib/screens/listing_detail_screen.dart
```

## Kurulum

### 1) Veritabanı
```bash
createdb ilan_platformu
psql -d ilan_platformu -f database/schema.sql
```

### 2) Backend
```bash
cd backend
cp .env.example .env   # PGUSER/PGPASSWORD vb. bilgilerinizi girin
npm install
npm run dev             # http://localhost:4000
```

### 3) Frontend (Next.js)
```bash
cd frontend
cp .env.local.example .env.local
npm install
npm run dev             # http://localhost:3000/ilanlar
```

### 4) Flutter
```bash
cd flutter
flutter pub get
# Fiziksel cihaz/farklı host için: --dart-define=API_BASE_URL=http://<ip>:4000/api
flutter run --dart-define=API_BASE_URL=http://10.0.2.2:4000/api
```

## JSONB Filtreleme Mantığı
- `listings.attributes` sütunu kategoriye göre değişen tüm dinamik alanları tutar (oda sayısı, km, yakıt tipi vb.).
- `categories.attribute_schema` sütunu, hangi alanların hangi tipte (select/number/boolean/text) filtrelenebileceğini tanımlar → Next.js filtre paneli bunu okuyarak formu dinamik oluşturur.
- Backend'de filtreleme PostgreSQL'in containment operatörü ile yapılır:
  ```sql
  WHERE attributes @> '{"room_count":"3+1","heating":"Kombi (Doğalgaz)"}'::jsonb
  ```
  Bu sorgu `idx_listings_attributes_gin` (GIN, jsonb_path_ops) indeksinden tam performans alır.
- API isteği örneği:
  ```
  GET /api/listings?category_id=1&city=İstanbul&min_price=1000000&attributes={"room_count":"3+1","furnished":true}
  ```

## Notlar / Üretime Geçiş Önerileri
- Kimlik doğrulama (JWT) ve yetkilendirme bu örnekte basitleştirilmiştir; gerçek ortamda `user_id` JWT'den alınmalıdır.
- Görsel yükleme, örnekte doğrudan URL kabul eder; üretimde S3/Cloudinary gibi bir depolama + multipart upload eklenmelidir.
- Flutter tarafında `flutter_secure_storage` ile token yönetimi ve `url_launcher` ile tel/mesaj aksiyonları tamamlanmalıdır.
