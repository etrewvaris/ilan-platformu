import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';

export default function Verify() {
  const router = useRouter();
  const { token } = router.query;
  const [status, setStatus] = useState('Doğrulanıyor...');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!token) return;

    const verifyToken = async () => {
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/auth/verify?token=${token}`);
        const data = await response.json();

        if (response.ok) {
          setStatus('Hesabınız başarıyla doğrulandı! Giriş sayfasına yönlendiriliyorsunuz...');
          setSuccess(true);
          setTimeout(() => {
            router.push('/login');
          }, 3000);
        } else {
          setStatus(data.message || 'Doğrulama başarısız.');
        }
      } catch (err) {
        setStatus('Sunucu hatası oluştu.');
      }
    };

    verifyToken();
  }, [token]);

  return (
    <div style={{ maxWidth: '400px', margin: '80px auto', textAlign: 'center', fontFamily: 'sans-serif' }}>
      <h2>E-posta Doğrulama</h2>
      <p style={{ color: success ? 'green' : 'red', marginTop: '20px' }}>{status}</p>
    </div>
  );
}