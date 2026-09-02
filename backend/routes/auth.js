const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const crypto = require('crypto');

// PostgreSQL havuz bağlantın (Proendeki db bağlantı dosyanı buraya uyarlayabilirsin)
const pool = require('../db'); // veya veritabanı bağlantı dosyanın yolu neyse

// Nodemailer Transporter Ayarı (Gmail veya SMTP bilgileri .env'den çekilir)
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

// Kayıt Ol (Register)
router.post('/register', async (req, res) => {
    try {
        const { email, password, name } = req.body;
        
        // Kullanıcı var mı kontrol et
        const userCheck = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        if (userCheck.rows.length > 0) {
            return res.status(400).json({ success: false, message: 'Bu email zaten kayıtlı.' });
        }

        // Şifreyi hashle
        const hashedPassword = await bcrypt.hash(password, 10);
        
        // Rastgele doğrulama tokeni üret
        const verificationToken = crypto.randomBytes(32).toString('hex');

        // Kullanıcıyı veritabanına kaydet (is_verified: false)
        await pool.query(
            'INSERT INTO users (email, password, name, is_verified, verification_token) VALUES ($1, $2, $3, false, $4)',
            [email, hashedPassword, name, verificationToken]
        );

        // Doğrulama maili gönder
        const verificationUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/verify?token=${verificationToken}`;
        
        await transporter.sendMail({
            from: process.env.EMAIL_USER,
            to: email,
            subject: 'İlan Platformu - Hesap Doğrulama',
            html: `<p>Merhaba ${name || ''},</p><p>Hesabınızı doğrulamak için lütfen aşağıdaki bağlantıya tıklayın:</p><a href="${verificationUrl}">Hesabımı Doğrula</a>`
        });

        res.status(201).json({ success: true, message: 'Kayıt başarılı! Lütfen email adresinizi doğrulayın.' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Mail Doğrulama (Verify)
router.get('/verify', async (req, res) => {
    try {
        const { token } = req.query;

        const userResult = await pool.query('SELECT * FROM users WHERE verification_token = $1', [token]);
        if (userResult.rows.length === 0) {
            return res.status(400).json({ success: false, message: 'Geçersiz veya süresi dolmuş doğrulama kodu.' });
        }

        const user = userResult.rows[0];

        // Kullanıcıyı doğrulanmış yap ve tokeni temizle
        await pool.query('UPDATE users SET is_verified = true, verification_token = NULL WHERE id = $1', [user.id]);

        res.status(200).json({ success: true, message: 'Hesap başarıyla doğrulandı! Giriş yapabilirsiniz.' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Giriş Yap (Login)
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        const userResult = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        if (userResult.rows.length === 0) {
            return res.status(400).json({ success: false, message: 'Kullanıcı bulunamadı.' });
        }

        const user = userResult.rows[0];

        // Mail doğrulanmış mı kontrol et
        if (!user.is_verified) {
            return res.status(401).json({ success: false, message: 'Lütfen önce e-posta adresinizi doğrulayın.' });
        }

        // Şifre kontrolü
        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) {
            return res.status(400).json({ success: false, message: 'Hatalı şifre.' });
        }

        // JWT Token oluştur
        const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET || 'gizli_anahtar', { expiresIn: '1d' });

        res.status(200).json({ success: true, message: 'Giriş başarılı', token });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;