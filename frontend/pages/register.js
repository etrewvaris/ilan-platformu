import { useState } from 'react';
import { useRouter } from 'next/router';

export default function Register() {
  const router = useRouter();
  const [formData, setFormData] = useState({ name: '', email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();
      if (response.ok) {
        setMessage('Kayıt başarılı! Lütfen e-posta kutunuzu kontrol ederek hesabınızı doğrulayın.');
      } else {
        setError(data.message || 'Kayıt olurken bir hata oluştu.');
      }
    } catch (err) {
      setError('Sunucuya bağlanılamadı.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '400px', margin: '60px auto', padding: '20px', fontFamily: 'sans-serif' }}>
      <h1>Kayıt Ol</h1>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      {message && <p style={{ color: 'green' }}>{message}</p>}
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
        <input type="text" name="name" placeholder="Ad Soyad" value={formData.name} onChange={handleChange} required style={{ padding: '10px' }} />
        <input type="email" name="email" placeholder="E-posta Adresi" value={formData.email} onChange={handleChange} required style={{ padding: '10px' }} />
        <input type="password" name="password" placeholder="Şifre" value={formData.password} onChange={handleChange} required style={{ padding: '10px' }} />
        <button type="submit" disabled={loading} style={{ padding: '12px', background: '#0070f3', color: '#fff', border: 'none', cursor: 'pointer' }}>
          {loading ? 'Kayıt yapılıyor...' : 'Kayıt Ol'}
        </button>
      </form>
    </div>
  );
}