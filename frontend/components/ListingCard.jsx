// components/ListingCard.jsx
import Link from 'next/link';

export default function ListingCard({ listing }) {
  const formattedPrice = new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: listing.currency || 'TRY',
    maximumFractionDigits: 0,
  }).format(listing.price);

  return (
    <Link href={`/ilanlar/${listing.id}`} className="listing-card">
      <div className="image-wrap">
        {listing.cover_image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={listing.cover_image} alt={listing.title} />
        ) : (
          <div className="no-image">Fotoğraf Yok</div>
        )}
        {listing.is_urgent && <span className="badge badge-urgent">Acil</span>}
        {listing.is_featured && <span className="badge badge-featured">Öne Çıkan</span>}
      </div>
      <div className="content">
        <p className="price">{formattedPrice}</p>
        <h3 className="title">{listing.title}</h3>
        <p className="location">{listing.district}, {listing.city}</p>
        <p className="category">{listing.category_name}</p>
      </div>

      <style jsx>{`
        .listing-card {
          display: block;
          border: 1px solid #e5e5e5;
          border-radius: 8px;
          overflow: hidden;
          text-decoration: none;
          color: inherit;
          background: #fff;
          transition: box-shadow 0.15s ease;
        }
        .listing-card:hover { box-shadow: 0 4px 14px rgba(0,0,0,0.08); }
        .image-wrap { position: relative; width: 100%; aspect-ratio: 4/3; background: #f4f4f4; }
        .image-wrap img { width: 100%; height: 100%; object-fit: cover; }
        .no-image { display:flex; align-items:center; justify-content:center; height:100%; color:#999; font-size:13px; }
        .badge { position: absolute; top: 8px; left: 8px; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 700; color: #fff; }
        .badge-urgent { background: #e53935; }
        .badge-featured { background: #ffb300; top: 32px; }
        .content { padding: 10px 12px; }
        .price { font-size: 17px; font-weight: 800; margin: 0 0 4px; color: #1a1a1a; }
        .title { font-size: 14px; margin: 0 0 6px; line-height: 1.3; height: 36px; overflow: hidden; }
        .location, .category { font-size: 12px; color: #777; margin: 2px 0; }
      `}</style>
    </Link>
  );
}
