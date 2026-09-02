// pages/ilanlar/[id].js
// Tekil ilan detay sayfası. Kategoriye özgü dinamik JSONB alanlarını
// (attribute_schema + attributes) okunabilir etiket/değer çiftlerine çevirir.
import Head from 'next/head';
import Link from 'next/link';
import { useState } from 'react';
import { fetchListingById } from '../../lib/api';

export async function getServerSideProps({ params }) {
  try {
    const result = await fetchListingById(params.id);
    if (!result.success || !result.data) {
      return { notFound: true };
    }
    return { props: { listing: result.data } };
  } catch (err) {
    return { notFound: true };
  }
}

function formatPrice(price, currency) {
  const symbols = { TRY: '₺', USD: '$', EUR: '€' };
  const symbol = symbols[currency] || currency || '₺';
  const formatted = Number(price).toLocaleString('tr-TR');
  return `${symbol}${formatted}`;
}

function DynamicAttributesGrid({ schema, attributes }) {
  if (!schema || !Array.isArray(schema) || schema.length === 0) return null;
  if (!attributes || typeof attributes !== 'object') return null;

  const rows = schema
    .map((field) => {
      const rawValue = attributes[field.key];
      if (rawValue === undefined || rawValue === null || rawValue === '') return null;
      let displayValue = rawValue;
      if (field.type === 'boolean') displayValue = rawValue ? 'Evet' : 'Hayır';
      if (Array.isArray(rawValue)) displayValue = rawValue.join(', ');
      return { label: field.label || field.key, value: displayValue };
    })
    .filter(Boolean);

  if (rows.length === 0) return null;

  return (
    <div className="attributes-grid">
      <h2>Özellikler</h2>
      <div className="grid">
        {rows.map((row, i) => (
          <div key={i} className="attr-item">
            <span className="attr-label">{row.label}</span>
            <span className="attr-value">{row.value}</span>
          </div>
        ))}
      </div>
      <style jsx>{`
        .attributes-grid { margin: 24px 0; }
        h2 { font-size: 18px; margin-bottom: 12px; }
        .grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
          gap: 12px;
        }
        .attr-item {
          display: flex;
          flex-direction: column;
          gap: 2px;
          padding: 10px 12px;
          background: #f7f7f7;
          border-radius: 8px;
        }
        .attr-label { font-size: 12px; color: #888; }
        .attr-value { font-size: 15px; font-weight: 600; color: #222; }
      `}</style>
    </div>
  );
}

export default function IlanDetaySayfasi({ listing }) {
  const images = listing.images && listing.images.length > 0 ? listing.images : [];
  const [activeImage, setActiveImage] = useState(0);

  return (
    <>
      <Head>
        <title>{listing.title} | İlan Platformu</title>
        <meta name="description" content={listing.description?.slice(0, 150) || listing.title} />
      </Head>

      <main className="page">
        <Link href="/ilanlar" className="back-link">← İlanlara dön</Link>

        <div className="detail-layout">
          <div className="gallery">
            {images.length > 0 ? (
              <>
                <div className="main-image">
                  <img src={images[activeImage].url} alt={listing.title} />
                </div>
                {images.length > 1 && (
                  <div className="thumbnails">
                    {images.map((img, i) => (
                      <img
                        key={img.id}
                        src={img.url}
                        alt=""
                        className={i === activeImage ? 'active' : ''}
                        onClick={() => setActiveImage(i)}
                      />
                    ))}
                  </div>
                )}
              </>
            ) : (
              <div className="no-image">Fotoğraf Yok</div>
            )}
          </div>

          <div className="info">
            <span className="category-badge">{listing.category?.name}</span>
            {listing.is_urgent && <span className="urgent-badge">Acil</span>}

            <h1>{listing.title}</h1>
            <div className="price">{formatPrice(listing.price, listing.currency)}</div>

            <div className="location">
              📍 {[listing.neighborhood, listing.district, listing.city].filter(Boolean).join(', ')}
            </div>

            <div className="meta-row">
              <span>{listing.view_count ?? 0} görüntülenme</span>
              {listing.created_at && (
                <span> · {new Date(listing.created_at).toLocaleDateString('tr-TR')}</span>
              )}
            </div>

            <DynamicAttributesGrid
              schema={listing.category?.attribute_schema}
              attributes={listing.attributes}
            />

            {listing.description && (
              <div className="description">
                <h2>Açıklama</h2>
                <p>{listing.description}</p>
              </div>
            )}

            <div className="seller-card">
              <h2>Satıcı</h2>
              <div className="seller-name">
                {listing.seller?.name}
                {listing.seller?.is_corporate && <span className="corp-badge">Kurumsal</span>}
              </div>
              {listing.seller?.phone && (
                <a href={`tel:${listing.seller.phone}`} className="phone-btn">
                  📞 {listing.seller.phone}
                </a>
              )}
            </div>
          </div>
        </div>
      </main>

      <style jsx>{`
        .page { max-width: 1100px; margin: 0 auto; padding: 20px; }
        .back-link {
          display: inline-block; margin-bottom: 16px; color: #555;
          text-decoration: none; font-size: 14px;
        }
        .back-link:hover { text-decoration: underline; }
        .detail-layout {
          display: grid; grid-template-columns: 1.3fr 1fr; gap: 32px;
        }
        .gallery { display: flex; flex-direction: column; gap: 10px; }
        .main-image {
          width: 100%; aspect-ratio: 4/3; background: #f2f2f2;
          border-radius: 10px; overflow: hidden;
        }
        .main-image img { width: 100%; height: 100%; object-fit: cover; }
        .no-image {
          width: 100%; aspect-ratio: 4/3; background: #f2f2f2;
          border-radius: 10px; display: flex; align-items: center;
          justify-content: center; color: #999;
        }
        .thumbnails { display: flex; gap: 8px; overflow-x: auto; }
        .thumbnails img {
          width: 70px; height: 70px; object-fit: cover; border-radius: 6px;
          cursor: pointer; opacity: 0.6; flex-shrink: 0;
        }
        .thumbnails img.active { opacity: 1; outline: 2px solid #f5b400; }
        .category-badge {
          display: inline-block; background: #eef2ff; color: #3949ab;
          font-size: 12px; padding: 4px 10px; border-radius: 20px; margin-right: 8px;
        }
        .urgent-badge {
          display: inline-block; background: #ffebee; color: #c62828;
          font-size: 12px; padding: 4px 10px; border-radius: 20px;
        }
        h1 { font-size: 24px; margin: 12px 0 8px; }
        .price { font-size: 26px; font-weight: 700; color: #222; margin-bottom: 10px; }
        .location { color: #555; font-size: 14px; margin-bottom: 4px; }
        .meta-row { color: #999; font-size: 13px; margin-bottom: 8px; }
        .description p { line-height: 1.6; color: #333; white-space: pre-wrap; }
        .seller-card {
          margin-top: 24px; padding: 16px; border: 1px solid #eee; border-radius: 10px;
        }
        .seller-name { font-weight: 600; margin-bottom: 10px; display: flex; align-items: center; gap: 8px; }
        .corp-badge {
          font-size: 11px; background: #e8f5e9; color: #2e7d32; padding: 2px 8px; border-radius: 10px;
        }
        .phone-btn {
          display: inline-block; background: #f5b400; color: #222; text-decoration: none;
          padding: 10px 16px; border-radius: 8px; font-weight: 600;
        }
        @media (max-width: 800px) {
          .detail-layout { grid-template-columns: 1fr; }
        }
      `}</style>
    </>
  );
}
