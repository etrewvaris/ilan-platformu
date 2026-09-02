// components/FilterPanel.jsx
// Statik filtreler (kategori, şehir, fiyat) + seçilen kategorinin
// attribute_schema'sına göre DİNAMİK olarak oluşturulan JSONB özellik filtreleri.
import { useState, useEffect, useMemo } from 'react';

export default function FilterPanel({ categories, initialFilters, onFilterChange }) {
  const [filters, setFilters] = useState({
    category_id: initialFilters.category_id || '',
    city: initialFilters.city || '',
    min_price: initialFilters.min_price || '',
    max_price: initialFilters.max_price || '',
    q: initialFilters.q || '',
    attributes: initialFilters.attributes || {},
  });

  const selectedCategory = useMemo(
    () => categories.find((c) => String(c.id) === String(filters.category_id)),
    [categories, filters.category_id]
  );

  // Kategori değişince o kategoriye ait olmayan dinamik özellik filtrelerini temizle
  useEffect(() => {
    setFilters((prev) => ({ ...prev, attributes: {} }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.category_id]);

  const handleStaticChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const handleAttributeChange = (key, value) => {
    setFilters((prev) => ({
      ...prev,
      attributes: {
        ...prev.attributes,
        // boş değeri tamamen kaldır ki filtreye dahil olmasın
        ...(value === '' || value === null ? { [key]: undefined } : { [key]: value }),
      },
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // undefined değerleri attributes objesinden temizle
    const cleanedAttributes = Object.fromEntries(
      Object.entries(filters.attributes).filter(([, v]) => v !== undefined)
    );
    onFilterChange({ ...filters, attributes: cleanedAttributes, page: 1 });
  };

  const handleReset = () => {
    const cleared = { category_id: '', city: '', min_price: '', max_price: '', q: '', attributes: {} };
    setFilters(cleared);
    onFilterChange({ ...cleared, page: 1 });
  };

  return (
    <form onSubmit={handleSubmit} className="filter-panel">
      <h3>Arama Filtreleri</h3>

      <div className="filter-group">
        <label htmlFor="q">Kelime Ara</label>
        <input
          id="q"
          type="text"
          placeholder="Başlıkta ara..."
          value={filters.q}
          onChange={(e) => handleStaticChange('q', e.target.value)}
        />
      </div>

      <div className="filter-group">
        <label htmlFor="category">Kategori</label>
        <select
          id="category"
          value={filters.category_id}
          onChange={(e) => handleStaticChange('category_id', e.target.value)}
        >
          <option value="">Tüm Kategoriler</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>

      <div className="filter-group">
        <label htmlFor="city">Şehir</label>
        <input
          id="city"
          type="text"
          placeholder="Örn: İstanbul"
          value={filters.city}
          onChange={(e) => handleStaticChange('city', e.target.value)}
        />
      </div>

      <div className="filter-group filter-group--row">
        <div>
          <label htmlFor="min_price">Min Fiyat</label>
          <input
            id="min_price"
            type="number"
            min="0"
            value={filters.min_price}
            onChange={(e) => handleStaticChange('min_price', e.target.value)}
          />
        </div>
        <div>
          <label htmlFor="max_price">Max Fiyat</label>
          <input
            id="max_price"
            type="number"
            min="0"
            value={filters.max_price}
            onChange={(e) => handleStaticChange('max_price', e.target.value)}
          />
        </div>
      </div>

      {/* --- Kategoriye özgü dinamik JSONB özellik filtreleri --- */}
      {selectedCategory && selectedCategory.attribute_schema?.length > 0 && (
        <div className="filter-group filter-group--dynamic">
          <hr />
          <h4>{selectedCategory.name} Özellikleri</h4>
          {selectedCategory.attribute_schema.map((attr) => (
            <div key={attr.key} className="filter-group">
              <label htmlFor={attr.key}>{attr.label}</label>

              {attr.type === 'select' && (
                <select
                  id={attr.key}
                  value={filters.attributes[attr.key] ?? ''}
                  onChange={(e) => handleAttributeChange(attr.key, e.target.value)}
                >
                  <option value="">Farketmez</option>
                  {attr.options.map((opt) => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              )}

              {attr.type === 'number' && (
                <input
                  id={attr.key}
                  type="number"
                  value={filters.attributes[attr.key] ?? ''}
                  onChange={(e) =>
                    handleAttributeChange(attr.key, e.target.value === '' ? '' : Number(e.target.value))
                  }
                />
              )}

              {attr.type === 'boolean' && (
                <select
                  id={attr.key}
                  value={filters.attributes[attr.key] === undefined ? '' : String(filters.attributes[attr.key])}
                  onChange={(e) =>
                    handleAttributeChange(attr.key, e.target.value === '' ? '' : e.target.value === 'true')
                  }
                >
                  <option value="">Farketmez</option>
                  <option value="true">Evet</option>
                  <option value="false">Hayır</option>
                </select>
              )}

              {attr.type === 'text' && (
                <input
                  id={attr.key}
                  type="text"
                  value={filters.attributes[attr.key] ?? ''}
                  onChange={(e) => handleAttributeChange(attr.key, e.target.value)}
                />
              )}
            </div>
          ))}
        </div>
      )}

      <div className="filter-actions">
        <button type="submit" className="btn btn-primary">Filtrele</button>
        <button type="button" className="btn btn-secondary" onClick={handleReset}>Temizle</button>
      </div>

      <style jsx>{`
        .filter-panel {
          background: #fff;
          border: 1px solid #e2e2e2;
          border-radius: 8px;
          padding: 16px;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        h3 { margin: 0 0 4px; font-size: 18px; }
        h4 { margin: 8px 0 4px; font-size: 14px; color: #555; }
        .filter-group { display: flex; flex-direction: column; gap: 4px; }
        .filter-group--row { flex-direction: row; gap: 12px; }
        .filter-group--row > div { flex: 1; display: flex; flex-direction: column; gap: 4px; }
        label { font-size: 13px; color: #444; font-weight: 600; }
        input, select {
          padding: 8px 10px;
          border: 1px solid #ccc;
          border-radius: 6px;
          font-size: 14px;
        }
        .filter-actions { display: flex; gap: 8px; margin-top: 8px; }
        .btn { flex: 1; padding: 10px; border-radius: 6px; border: none; cursor: pointer; font-weight: 600; }
        .btn-primary { background: #ffcc00; color: #222; }
        .btn-secondary { background: #f1f1f1; color: #333; }
        hr { border: none; border-top: 1px solid #eee; margin: 4px 0; }
      `}</style>
    </form>
  );
}
