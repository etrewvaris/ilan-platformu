// lib/api.js
// Backend API'sine yapılan tüm istekleri tek noktadan yöneten yardımcı katman.

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

/**
 * İlanları filtre parametrelerine göre getirir.
 * @param {Object} filters - { category_id, city, min_price, max_price, q, attributes, sort, page, limit }
 */
export async function fetchListings(filters = {}) {
  const params = new URLSearchParams();

  Object.entries(filters).forEach(([key, val]) => {
    if (val === undefined || val === null || val === '') return;
    if (key === 'attributes' && typeof val === 'object') {
      // Boş obje ise gönderme
      if (Object.keys(val).length === 0) return;
      params.set('attributes', JSON.stringify(val));
    } else {
      params.set(key, val);
    }
  });

  const res = await fetch(`${API_BASE_URL}/listings?${params.toString()}`, {
    // Liste sayfası sık değiştiği için kısa süreli cache
    next: { revalidate: 30 },
  });

  if (!res.ok) {
    throw new Error('İlanlar getirilirken bir hata oluştu');
  }
  return res.json();
}

export async function fetchListingById(id) {
  const res = await fetch(`${API_BASE_URL}/listings/${id}`, { cache: 'no-store' });
  if (!res.ok) {
    throw new Error('İlan getirilirken bir hata oluştu');
  }
  return res.json();
}

export async function fetchCategories() {
  const res = await fetch(`${API_BASE_URL}/categories`, { next: { revalidate: 3600 } });
  if (!res.ok) {
    throw new Error('Kategoriler getirilirken bir hata oluştu');
  }
  return res.json();
}

export { API_BASE_URL };
