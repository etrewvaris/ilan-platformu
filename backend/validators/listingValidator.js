// validators/listingValidator.js
const Joi = require('joi');

// Yeni ilan oluşturma isteği için doğrulama şeması.
// "attributes" alanı kategoriye göre değişken olduğundan serbest bir
// JSON objesi olarak kabul edilir; kategoriye özgü zorunlu alan kontrolü
// ayrıca kategori attribute_schema'sına bakılarak controller içinde yapılabilir.
const createListingSchema = Joi.object({
  user_id: Joi.string().uuid().required(),
  category_id: Joi.number().integer().positive().required(),
  title: Joi.string().min(10).max(200).required(),
  description: Joi.string().min(20).max(5000).required(),
  price: Joi.number().min(0).precision(2).required(),
  currency: Joi.string().valid('TRY', 'USD', 'EUR').default('TRY'),
  city: Joi.string().max(80).required(),
  district: Joi.string().max(80).required(),
  neighborhood: Joi.string().max(120).allow(null, ''),
  latitude: Joi.number().min(-90).max(90).allow(null),
  longitude: Joi.number().min(-180).max(180).allow(null),
  attributes: Joi.object().unknown(true).default({}),
  is_urgent: Joi.boolean().default(false),
  images: Joi.array().items(Joi.string().uri()).max(20).default([]),
});

// İlan listeleme/filtreleme sorgu parametreleri için doğrulama şeması.
const listQuerySchema = Joi.object({
  category_id: Joi.number().integer().positive(),
  city: Joi.string().max(80),
  district: Joi.string().max(80),
  min_price: Joi.number().min(0),
  max_price: Joi.number().min(0),
  q: Joi.string().max(200), // başlıkta serbest metin araması
  // JSONB attributes filtresi: query string üzerinden JSON string olarak gelir.
  // Örn: ?attributes={"room_count":"3+1","heating":"Kombi (Doğalgaz)"}
  attributes: Joi.string().max(2000),
  sort: Joi.string().valid('created_at_desc', 'price_asc', 'price_desc').default('created_at_desc'),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
});

module.exports = { createListingSchema, listQuerySchema };
