// routes/categories.js
// Next.js filtre panelinin hangi alanları (oda sayısı, marka, yakıt tipi vb.)
// göstereceğini belirlemek için kategori + attribute_schema bilgisini sağlar.
const express = require('express');
const router = express.Router();
const { query } = require('../config/db');

router.get('/', async (req, res) => {
  try {
    const result = await query(
      'SELECT id, parent_id, name, slug, attribute_schema FROM categories ORDER BY id ASC'
    );
    return res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('Kategori listeleme hatası:', err);
    return res.status(500).json({ success: false, message: 'Kategoriler getirilirken hata oluştu' });
  }
});

router.get('/:slug', async (req, res) => {
  try {
    const result = await query('SELECT id, parent_id, name, slug, attribute_schema FROM categories WHERE slug = $1', [
      req.params.slug,
    ]);
    if (result.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'Kategori bulunamadı' });
    }
    return res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error('Kategori getirme hatası:', err);
    return res.status(500).json({ success: false, message: 'Kategori getirilirken hata oluştu' });
  }
});

module.exports = router;
