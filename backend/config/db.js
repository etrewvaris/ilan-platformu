// config/db.js
// PostgreSQL bağlantı havuzu (connection pool) yapılandırması.
require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.PGHOST || 'localhost',
  port: Number(process.env.PGPORT) || 5432,
  database: process.env.PGDATABASE || 'ilan_platformu',
  user: process.env.PGUSER || 'postgres',
  password: process.env.PGPASSWORD || '',
  max: 20,                     // havuzdaki maksimum bağlantı sayısı
  idleTimeoutMillis: 30000,    // boşta kalan bağlantıyı kapatma süresi
  connectionTimeoutMillis: 5000,
});

pool.on('error', (err) => {
  // Havuzdaki boşta bir client'ta beklenmeyen hata (örn. bağlantı kopması)
  console.error('Beklenmeyen PostgreSQL havuz hatası:', err);
});

// Tüm sorguları tek noktadan geçirerek loglama/izleme eklemeyi kolaylaştırır.
async function query(text, params) {
  const start = Date.now();
  const result = await pool.query(text, params);
  const duration = Date.now() - start;
  if (process.env.NODE_ENV !== 'production') {
    console.log('SQL çalıştı', { text, duration, rows: result.rowCount });
  }
  return result;
}

// Transaction (işlem) gerektiren durumlar için tekil client alma yardımcı fonksiyonu.
async function getClient() {
  const client = await pool.connect();
  return client;
}

module.exports = { pool, query, getClient };
