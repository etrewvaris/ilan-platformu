// server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');

const listingsRouter = require('./routes/listings');
const categoriesRouter = require('./routes/categories');
const app = express();
app.set('trust proxy', 1);
app.use(helmet());
app.use(compression());
app.use(cors({ origin: process.env.CORS_ORIGIN || '*' }));
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));

// Genel istek sınırlama (kaba kuvvet / kötüye kullanım önleme)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 dakika
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

app.get('/health', (req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

app.use('/api/listings', listingsRouter);
app.use('/api/categories', categoriesRouter);
const authRouter = require('./routes/auth');
// 404 handler
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Uç nokta bulunamadı' });
});

// Merkezi hata yakalayıcı
app.use((err, req, res, next) => {
  console.error('Beklenmeyen hata:', err);
  res.status(500).json({ success: false, message: 'Sunucu hatası' });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`İlan platformu API ${PORT} portunda çalışıyor`);
});
