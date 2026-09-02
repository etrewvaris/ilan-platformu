const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
// Not: Projende Prisma veya veritabanı bağlantın nereden yapılıyorsa onu buraya dahil etmelisin
// Örn: const { PrismaClient } = require('@prisma/client');
// const prisma = new PrismaClient();

// Kayıt Ol (Register)
router.post('/register', async (req, res) => {
    try {
        const { email, password, name } = req.body;
        
        // Kullanıcı var mı kontrol et
        // const existingUser = await prisma.user.findUnique({ where: { email } });
        // if (existingUser) return res.status(400).json({ success: false, message: 'Bu email zaten kayıtlı.' });

        // Şifreyi şifrele (hash)
        const hashedPassword = await bcrypt.hash(password, 10);

        // Kullanıcıyı veritabanına kaydet
        // const newUser = await prisma.user.create({
        //     data: { email, password: hashedPassword, name }
        // });

        res.status(201).json({ success: true, message: 'Kayıt başarıyla oluşturuldu.' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Giriş Yap (Login)
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        // Kullanıcıyı bul
        // const user = await prisma.user.findUnique({ where: { email } });
        // if (!user) return res.status(400).json({ success: false, message: 'Kullanıcı bulunamadı.' });

        // Şifre kontrolü
        // const validPassword = await bcrypt.compare(password, user.password);
        // if (!validPassword) return res.status(400).json({ success: false, message: 'Hatalı şifre.' });

        // JWT Token oluştur
        // const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET || 'gizli_anahtar', { expiresIn: '1d' });

        res.status(200).json({ success: true, message: 'Giriş başarılı', token: 'ornek_token' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;