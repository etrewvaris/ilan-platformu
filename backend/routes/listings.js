// routes/listings.js
const express = require('express');
const router = express.Router();
const { query, getClient } = require('../config/db');
const { createListingSchema, listQuerySchema } = require('../validators/listingValidator');

/* =====================================================================
 * POST /api/listings
 * Yeni ilan ekler. Fotoğraflar varsa aynı transaction içinde
 * listing_images tablosuna da yazılır.
 * ===================================================================== */
router.post('/', async (req, res) => {
  const { error, value } = createListingSchema.validate(req.body, { abortEarly: false });
  if (error) {
    return res.status(400).json({
      success: false,
      message: 'Doğrulama hatası',
      details: error.details.map((d) => d.message),
    });
  }

  const {
    user_id, category_id, title, description, price, currency,
    city, district, neighborhood, latitude, longitude,
    attributes, is_urgent, images,
  } = value;

  const client = await getClient();
  try {
    await client.query('BEGIN');

    // Kategori gerçekten var mı kontrol et (foreign key hatasını daha
    // anlamlı bir mesaja çevirmek için).
    const categoryCheck = await client.query('SELECT id FROM categories WHERE id = $1', [category_id]);
    if (categoryCheck.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: 'Kategori bulunamadı' });
    }

    const insertListingText = `
      INSERT INTO listings
        (user_id, category_id, title, description, price, currency,
         city, district, neighborhood, latitude, longitude, attributes,
         is_urgent, status, published_at)
      VALUES
        ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12::jsonb, $13, 'active', now())
      RETURNING *;
    `;
    const listingResult = await client.query(insertListingText, [
      user_id, category_id, title, description, price, currency,
      city, district, neighborhood || null, latitude || null, longitude || null,
      JSON.stringify(attributes || {}), is_urgent,
    ]);

    const listing = listingResult.rows[0];

    // Fotoğrafları ekle (varsa)
    if (images && images.length > 0) {
      const imageValues = [];
      const placeholders = images.map((url, idx) => {
        const base = idx * 4;
        imageValues.push(listing.id, url, idx, idx === 0);
        return `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4})`;
      }).join(', ');

      await client.query(
        `INSERT INTO listing_images (listing_id, url, sort_order, is_cover) VALUES ${placeholders}`,
        imageValues
      );
    }

    await client.query('COMMIT');

    return res.status(201).json({ success: true, data: listing });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('İlan ekleme hatası:', err);
    return res.status(500).json({ success: false, message: 'İlan eklenirken bir sunucu hatası oluştu' });
  } finally {
    client.release();
  }
});

/* =====================================================================
 * GET /api/listings/:id
 * Tek bir ilanın tüm detaylarını (fotoğraflar dahil) getirir.
 * Görüntülenme sayacını da artırır.
 * ===================================================================== */
router.get('/:id', async (req, res) => {
  const { id } = req.params;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(id)) {
    return res.status(400).json({ success: false, message: 'Geçersiz ilan kimliği' });
  }

  try {
    const listingText = `
      SELECT
        l.*,
        c.name AS category_name,
        c.slug AS category_slug,
        c.attribute_schema AS category_attribute_schema,
        u.full_name AS seller_name,
        u.phone AS seller_phone,
        u.is_corporate AS seller_is_corporate
      FROM listings l
      JOIN categories c ON c.id = l.category_id
      JOIN users u ON u.id = l.user_id
      WHERE l.id = $1;
    `;
    const listingResult = await query(listingText, [id]);

    if (listingResult.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'İlan bulunamadı' });
    }

    // Görüntülenme sayısını asenkron olarak artır (yanıtı bekletmeden)
    query('UPDATE listings SET view_count = view_count + 1 WHERE id = $1', [id]).catch((e) =>
      console.error('view_count güncellenemedi:', e)
    );

    const imagesResult = await query(
      'SELECT id, url, sort_order, is_cover FROM listing_images WHERE listing_id = $1 ORDER BY sort_order ASC',
      [id]
    );

    const listing = listingResult.rows[0];

    return res.json({
      success: true,
      data: {
        id: listing.id,
        title: listing.title,
        description: listing.description,
        price: Number(listing.price),
        currency: listing.currency,
        city: listing.city,
        district: listing.district,
        neighborhood: listing.neighborhood,
        latitude: listing.latitude,
        longitude: listing.longitude,
        attributes: listing.attributes,
        status: listing.status,
        view_count: listing.view_count,
        is_urgent: listing.is_urgent,
        is_featured: listing.is_featured,
        created_at: listing.created_at,
        category: {
          id: listing.category_id,
          name: listing.category_name,
          slug: listing.category_slug,
          attribute_schema: listing.category_attribute_schema,
        },
        seller: {
          name: listing.seller_name,
          phone: listing.seller_phone,
          is_corporate: listing.seller_is_corporate,
        },
        images: imagesResult.rows,
      },
    });
  } catch (err) {
    console.error('İlan detay hatası:', err);
    return res.status(500).json({ success: false, message: 'İlan getirilirken bir sunucu hatası oluştu' });
  }
});

/* =====================================================================
 * GET /api/listings
 * Kategori, şehir, fiyat aralığı, metin araması VE JSONB "attributes"
 * alanına göre dinamik filtreleme yapan ana listeleme uç noktası.
 *
 * JSONB filtreleme için PostgreSQL'in `@>` (containment) operatörü
 * kullanılır: attributes @> '{"room_count":"3+1"}'::jsonb
 * Bu, GIN (jsonb_path_ops) indeksinden tam olarak faydalanır.
 * ===================================================================== */
router.get('/', async (req, res) => {
  const { error, value } = listQuerySchema.validate(req.query, { abortEarly: false });
  if (error) {
    return res.status(400).json({
      success: false,
      message: 'Doğrulama hatası',
      details: error.details.map((d) => d.message),
    });
  }

  const { category_id, city, district, min_price, max_price, q, attributes, sort, page, limit } = value;

  const whereClauses = [`status = 'active'`];
  const params = [];

  if (category_id) {
    params.push(category_id);
    whereClauses.push(`category_id = $${params.length}`);
  }
  if (city) {
    params.push(city);
    whereClauses.push(`city ILIKE $${params.length}`);
  }
  if (district) {
    params.push(district);
    whereClauses.push(`district ILIKE $${params.length}`);
  }
  if (min_price !== undefined) {
    params.push(min_price);
    whereClauses.push(`price >= $${params.length}`);
  }
  if (max_price !== undefined) {
    params.push(max_price);
    whereClauses.push(`price <= $${params.length}`);
  }
  if (q) {
    params.push(`%${q}%`);
    whereClauses.push(`title ILIKE $${params.length}`);
  }

  // --- JSONB özellik filtresi ---
  // "attributes" query parametresi: {"room_count":"3+1","heating":"Kombi (Doğalgaz)"}
  // gibi bir JSON string olarak beklenir; doğrudan containment (@>) ile eşleştirilir.
  // Sayısal aralık filtresi gerekiyorsa (örn. min_gross_m2/max_gross_m2) ayrı
  // parametreler eklenip ->> operatörüyle CAST edilerek karşılaştırılabilir.
  if (attributes) {
    let parsedAttrs;
    try {
      parsedAttrs = JSON.parse(attributes);
    } catch (e) {
      return res.status(400).json({ success: false, message: '"attributes" geçerli bir JSON olmalıdır' });
    }
    if (parsedAttrs && typeof parsedAttrs === 'object' && Object.keys(parsedAttrs).length > 0) {
      params.push(JSON.stringify(parsedAttrs));
      whereClauses.push(`attributes @> $${params.length}::jsonb`);
    }
  }

  const sortMap = {
    created_at_desc: 'created_at DESC',
    price_asc: 'price ASC',
    price_desc: 'price DESC',
  };
  const orderBy = sortMap[sort] || sortMap.created_at_desc;

  const offset = (page - 1) * limit;
  params.push(limit);
  const limitIdx = params.length;
  params.push(offset);
  const offsetIdx = params.length;

  const whereSql = whereClauses.join(' AND ');

  try {
    const listSql = `
      SELECT
        l.id, l.title, l.price, l.currency, l.city, l.district,
        l.attributes, l.is_urgent, l.is_featured, l.created_at,
        l.category_id, c.name AS category_name,
        (
          SELECT url FROM listing_images li
          WHERE li.listing_id = l.id
          ORDER BY li.is_cover DESC, li.sort_order ASC
          LIMIT 1
        ) AS cover_image
      FROM listings l
      JOIN categories c ON c.id = l.category_id
      WHERE ${whereSql}
      ORDER BY l.is_featured DESC, ${orderBy}
      LIMIT $${limitIdx} OFFSET $${offsetIdx};
    `;

    const countSql = `SELECT COUNT(*)::int AS total FROM listings l WHERE ${whereSql};`;
    // count sorgusu limit/offset parametrelerini kullanmaz
    const countParams = params.slice(0, params.length - 2);

    const [listResult, countResult] = await Promise.all([
      query(listSql, params),
      query(countSql, countParams),
    ]);

    const total = countResult.rows[0].total;

    return res.json({
      success: true,
      data: listResult.rows.map((r) => ({ ...r, price: Number(r.price) })),
      pagination: {
        page,
        limit,
        total,
        total_pages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    console.error('İlan listeleme hatası:', err);
    return res.status(500).json({ success: false, message: 'İlanlar listelenirken bir sunucu hatası oluştu' });
  }
});

module.exports = router;
