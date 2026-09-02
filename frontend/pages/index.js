// pages/ilanlar/index.js
// Arama filtre paneli bulunan ana ilan listeleme sayfası.
// İlk yükleme sunucu tarafında (SSR) yapılır; filtre değişimlerinde
// istemci tarafından backend'e istek atılır ve URL güncellenir.
import { useState, useCallback } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import FilterPanel from '../components/FilterPanel';
import ListingCard from '../components/ListingCard';
import { fetchListings, fetchCategories, API_BASE_URL } from '../lib/api';

export async function getServerSideProps({ query }) {
  const filters = {
    category_id: query.category_id || '',
    city: query.city || '',
    min_price: query.min_price || '',
    max_price: query.max_price || '',
    q: query.q || '',
    attributes: query.attributes ? JSON.parse(query.attributes) : {},
    page: Number(query.page) || 1,
    limit: 20,
  };

  try {
    const [listingsRes, categoriesRes] = await Promise.all([
      fetchListings(filters),
      fetchCategories(),
    ]);

    return {
      props: {
        initialListings: listingsRes.data || [],
        pagination: listingsRes.pagination || { page: 1, total: 0, total_pages: 1 },
        categories: categoriesRes.data || [],
        initialFilters: filters,
      },
    };
  } catch (err) {
    return {
      props: {
        initialListings: [],
        pagination: { page: 1, total: 0, total_pages: 1 },
        categories: [],
        initialFilters: filters,
        errorMessage: 'İlanlar yüklenirken bir sorun oluştu. Lütfen API sunucusunun çalıştığından emin olun.',
      },
    };
  }
}

export default function IlanListelemeSayfasi({
  initialListings,
  pagination,
  categories,
  initialFilters,
  errorMessage,
}) {
  const router = useRouter();
  const [listings, setListings] = useState(initialListings);
  const [meta, setMeta] = useState(pagination);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(errorMessage || null);
  const [currentFilters, setCurrentFilters] = useState(initialFilters);

  const applyFilters = useCallback(async (newFilters) => {
    setLoading(true);
    setError(null);
    setCurrentFilters(newFilters);

    // URL'i filtre durumuyla senkronize et (paylaşılabilir / geri tuşu ile çalışır)
    const queryObj = {};
    if (newFilters.category_id) queryObj.category_id = newFilters.category_id;
    if (newFilters.city) queryObj.city = newFilters.city;
    if (newFilters.min_price) queryObj.min_price = newFilters.min_price;
    if (newFilters.max_price) queryObj.max_price = newFilters.max_price;
    if (newFilters.q) queryObj.q = newFilters.q;
    if (newFilters.attributes && Object.keys(newFilters.attributes).length > 0) {
      queryObj.attributes = JSON.stringify(newFilters.attributes);
    }
    if (newFilters.page && newFilters.page > 1) queryObj.page = newFilters.page;

    router.push({ pathname: '/ilanlar', query: queryObj }, undefined, { shallow: true });

    try {
      const result = await fetchListings(newFilters);
      setListings(result.data || []);
      setMeta(result.pagination || { page: 1, total: 0, total_pages: 1 });
    } catch (err) {
      setError('İlanlar yüklenirken bir hata oluştu. Lütfen tekrar deneyin.');
    } finally {
      setLoading(false);
    }
  }, [router]);

  const goToPage = (page) => {
    applyFilters({ ...currentFilters, page });
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <>
      <Head>
        <title>İlanlar | İlan Platformu</title>
        <meta name="description" content="Emlak, vasıta ve daha fazlası için binlerce ilan arasından arayın." />
      </Head>

      <main className="page">
        <aside className="sidebar">
          <FilterPanel categories={categories} initialFilters={initialFilters} onFilterChange={applyFilters} />
        </aside>

        <section className="results">
          <div className="results-header">
            <h1>İlanlar</h1>
            <span className="result-count">{meta.total} sonuç bulundu</span>
          </div>

          {error && <div className="alert-error">{error}</div>}

          {loading ? (
            <div className="loading">Yükleniyor...</div>
          ) : listings.length === 0 ? (
            <div className="empty-state">Bu kriterlere uygun ilan bulunamadı.</div>
          ) : (
            <div className="grid">
              {listings.map((listing) => (
                <ListingCard key={listing.id} listing={listing} />
              ))}
            </div>
          )}

          {meta.total_pages > 1 && (
            <div className="pagination">
              <button disabled={meta.page <= 1} onClick={() => goToPage(meta.page - 1)}>Önceki</button>
              <span>Sayfa {meta.page} / {meta.total_pages}</span>
              <button disabled={meta.page >= meta.total_pages} onClick={() => goToPage(meta.page + 1)}>Sonraki</button>
            </div>
          )}
        </section>
      </main>

      <style jsx>{`
        .page {
          display: grid;
          grid-template-columns: 280px 1fr;
          gap: 20px;
          max-width: 1200px;
          margin: 0 auto;
          padding: 20px;
        }
        .results-header { display: flex; align-items: baseline; justify-content: space-between; margin-bottom: 12px; }
        h1 { font-size: 22px; margin: 0; }
        .result-count { color: #777; font-size: 14px; }
        .grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
          gap: 16px;
        }
        .loading, .empty-state { padding: 60px 0; text-align: center; color: #888; }
        .alert-error { background: #fdecea; color: #b71c1c; padding: 10px 14px; border-radius: 6px; margin-bottom: 12px; }
        .pagination { display: flex; justify-content: center; align-items: center; gap: 16px; margin-top: 24px; }
        .pagination button {
          padding: 8px 16px; border: 1px solid #ccc; background: #fff; border-radius: 6px; cursor: pointer;
        }
        .pagination button:disabled { opacity: 0.4; cursor: not-allowed; }
        @media (max-width: 800px) {
          .page { grid-template-columns: 1fr; }
        }
      `}</style>
    </>
  );
}
