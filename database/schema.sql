-- =====================================================================
-- SAHIBINDEN.COM TARZI İLAN PLATFORMU - POSTGRESQL ŞEMASI
-- =====================================================================
-- Gereksinimler: PostgreSQL 13+ (JSONB, GIN index, gen_random_uuid için
-- pgcrypto veya pgcrypto yerine uuid-ossp eklentisi gerekir)
-- =====================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";   -- gen_random_uuid() için
CREATE EXTENSION IF NOT EXISTS "pg_trgm";    -- başlık/açıklama ILIKE arama hızlandırma için

-- ---------------------------------------------------------------------
-- 1) KULLANICILAR
-- ---------------------------------------------------------------------
CREATE TABLE users (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email           VARCHAR(255) NOT NULL UNIQUE,
    password_hash   VARCHAR(255) NOT NULL,
    full_name       VARCHAR(150) NOT NULL,
    phone           VARCHAR(20),
    is_corporate    BOOLEAN NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------
-- 2) KATEGORİLER (hiyerarşik: Emlak > Konut > Satılık gibi)
-- ---------------------------------------------------------------------
CREATE TABLE categories (
    id              SERIAL PRIMARY KEY,
    parent_id       INTEGER REFERENCES categories(id) ON DELETE CASCADE,
    name            VARCHAR(100) NOT NULL,
    slug            VARCHAR(120) NOT NULL UNIQUE,
    -- Bu kategoriye ait ilanlarda "attributes" JSONB alanında hangi
    -- alanların (oda sayısı, m2, yakıt tipi, marka vb.) bulunacağını
    -- ve filtre panelinin nasıl render edileceğini tanımlayan şema.
    -- Örn: [{"key":"room_count","label":"Oda Sayısı","type":"select","options":["1+1","2+1","3+1"]}, ...]
    attribute_schema JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_categories_parent_id ON categories(parent_id);
CREATE INDEX idx_categories_attribute_schema ON categories USING GIN (attribute_schema);

-- ---------------------------------------------------------------------
-- 3) İLANLAR (ana tablo)
-- ---------------------------------------------------------------------
CREATE TYPE listing_status AS ENUM ('draft', 'active', 'passive', 'sold', 'rejected', 'expired');

CREATE TABLE listings (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    category_id     INTEGER NOT NULL REFERENCES categories(id),

    title           VARCHAR(200) NOT NULL,
    description     TEXT NOT NULL,
    price           NUMERIC(14, 2) NOT NULL CHECK (price >= 0),
    currency        VARCHAR(3) NOT NULL DEFAULT 'TRY',

    city            VARCHAR(80) NOT NULL,
    district         VARCHAR(80) NOT NULL,
    neighborhood    VARCHAR(120),
    latitude        DOUBLE PRECISION,
    longitude       DOUBLE PRECISION,

    -- Kategoriye özgü tüm dinamik alanlar burada saklanır.
    -- Emlak: {"room_count":"3+1","gross_m2":140,"net_m2":120,"floor":4,"heating":"Kombi (Doğalgaz)","furnished":false}
    -- Vasıta: {"brand":"Renault","model":"Clio","year":2019,"km":45000,"fuel_type":"Dizel","gear":"Manuel"}
    attributes      JSONB NOT NULL DEFAULT '{}'::jsonb,

    status          listing_status NOT NULL DEFAULT 'active',
    view_count      INTEGER NOT NULL DEFAULT 0,
    is_urgent       BOOLEAN NOT NULL DEFAULT FALSE,
    is_featured     BOOLEAN NOT NULL DEFAULT FALSE,

    published_at    TIMESTAMPTZ,
    expires_at      TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Filtreleme ve arama performansı için indeksler
CREATE INDEX idx_listings_category_id   ON listings(category_id);
CREATE INDEX idx_listings_status        ON listings(status);
CREATE INDEX idx_listings_city_district ON listings(city, district);
CREATE INDEX idx_listings_price         ON listings(price);
CREATE INDEX idx_listings_created_at    ON listings(created_at DESC);
-- JSONB attributes içindeki HERHANGİ bir anahtar/değer üzerinden filtreleme için GIN index (@>, ?, ?& operatörleri)
CREATE INDEX idx_listings_attributes_gin ON listings USING GIN (attributes jsonb_path_ops);
-- Başlık/açıklama içinde metin araması için trigram index
CREATE INDEX idx_listings_title_trgm ON listings USING GIN (title gin_trgm_ops);
-- Aktif + kategoriye göre en sık atılan sorgu için kombine index
CREATE INDEX idx_listings_active_category ON listings(category_id, status, created_at DESC) WHERE status = 'active';

-- ---------------------------------------------------------------------
-- 4) İLAN FOTOĞRAFLARI
-- ---------------------------------------------------------------------
CREATE TABLE listing_images (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    listing_id      UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
    url             TEXT NOT NULL,
    sort_order      INTEGER NOT NULL DEFAULT 0,
    is_cover        BOOLEAN NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_listing_images_listing_id ON listing_images(listing_id);

-- ---------------------------------------------------------------------
-- 5) FAVORİLER
-- ---------------------------------------------------------------------
CREATE TABLE favorites (
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    listing_id  UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, listing_id)
);

-- ---------------------------------------------------------------------
-- 6) updated_at otomatik güncelleme trigger'ı
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_listings_updated_at
BEFORE UPDATE ON listings
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_users_updated_at
BEFORE UPDATE ON users
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------
-- 7) ÖRNEK VERİ
-- ---------------------------------------------------------------------
INSERT INTO categories (name, slug, attribute_schema) VALUES
('Konut (Satılık)', 'satilik-konut', '[
    {"key":"room_count","label":"Oda Sayısı","type":"select","options":["1+0","1+1","2+1","3+1","4+1","5+1 ve üzeri"]},
    {"key":"gross_m2","label":"m² (Brüt)","type":"number"},
    {"key":"net_m2","label":"m² (Net)","type":"number"},
    {"key":"building_age","label":"Bina Yaşı","type":"number"},
    {"key":"floor","label":"Bulunduğu Kat","type":"number"},
    {"key":"heating","label":"Isıtma","type":"select","options":["Kombi (Doğalgaz)","Merkezi","Klima","Soba","Yerden Isıtma"]},
    {"key":"furnished","label":"Eşyalı","type":"boolean"},
    {"key":"in_site","label":"Site İçerisinde","type":"boolean"}
]'::jsonb),
('Vasıta (Otomobil)', 'satilik-otomobil', '[
    {"key":"brand","label":"Marka","type":"select","options":["Renault","Volkswagen","Fiat","Toyota","Ford"]},
    {"key":"model","label":"Model","type":"text"},
    {"key":"year","label":"Yıl","type":"number"},
    {"key":"km","label":"Kilometre","type":"number"},
    {"key":"fuel_type","label":"Yakıt Tipi","type":"select","options":["Benzin","Dizel","LPG","Hibrit","Elektrik"]},
    {"key":"gear","label":"Vites","type":"select","options":["Manuel","Otomatik","Yarı Otomatik"]}
]'::jsonb);

INSERT INTO users (email, password_hash, full_name, phone) VALUES
('demo@example.com', '$2b$10$abcdefghijklmnopqrstuv', 'Demo Kullanıcı', '05551234567');
