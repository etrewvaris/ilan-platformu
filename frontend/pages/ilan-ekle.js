import { useState } from 'react';
import { useRouter } from 'next/router';

export default function IlanEkle() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    price: '',
    currency: 'TL',
    category_id: '',
    city: '',
    district: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/listings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();
      if (response.ok) {
        router.push('/');
      } else {
        setError(data.message || 'İlan eklenirken bir hata oluştu.');
      }
    } catch (err) {
      setError('Sunucuya bağlanılamadı.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '600px', margin: '40px auto', padding: '20px', fontFamily: 'sans-serif' }}>
      <h1>Yeni İlan Ekle</h1>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
        <input type="text" name="title" placeholder="İlan Başlığı" value={formData.title} onChange={handleChange} required style={{ padding: '10px' }} />
        <textarea name="description" placeholder="Açıklama" value={formData.description} onChange={handleChange} required style={{ padding: '10px', height: '100px' }} />
        <input type="number" name="price" placeholder="Fiyat" value={formData.price} onChange={handleChange} required style={{ padding: '10px' }} />
        <input type="text" name="category_id" placeholder="Kategori ID" value={formData.category_id} onChange={handleChange} required style={{ padding: '10px' }} />
        <input type="text" name="city" placeholder="Şehir" value={formData.city} onChange={handleChange} style={{ padding: '10px' }} />
        <input type="text" name="district" placeholder="İlçe" value={formData.district} onChange={handleChange} style={{ padding: '10px' }} />
        
        <button type="submit" disabled={loading} style={{ padding: '12px', background: '#0070f3', color: '#fff', border: 'none', cursor: 'pointer' }}>
          {loading ? 'Ekleniyor...' : 'İlanı Yayınla'}
        </button>
      </form>
    </div>
  );
}