require('dotenv').config();
const express = require('express');
const session = require('express-session');
const mongoose = require('mongoose');
const axios = require('axios');
const path = require('path');
const User = require('./data');

const app = express();
const port = process.env.PORT || 3000;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "12345";

// --- ПОДКЛЮЧЕНИЕ К БАЗЕ ДАННЫХ ---
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ Connected to MongoDB Atlas'))
  .catch(err => {
    console.error('❌ MongoDB Connection Error:', err.message);
  });

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Сначала сессии
app.use(session({
  secret: 'chronos-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: { 
    maxAge: 24 * 60 * 60 * 1000,
    secure: false 
  }
}));

// --- ГЛАВНАЯ СТРАНИЦА И ПРОВЕРКА ВХОДА ---
app.get('/', (req, res) => {
    if (req.session.isLoggedIn) {
        // Если залогинен — отдаем index.html из папки public
        res.sendFile(path.join(__dirname, 'public', 'index.html'));
    } else {
        // Если не залогинен — перекидываем на страницу входа
        res.redirect('/login.html');
    }
});

// Раздаем статические файлы ПОСЛЕ обработки корня
app.use(express.static('public'));

// Проверка авторизации для API
const checkAuth = (req, res, next) => {
  if (req.session.isLoggedIn) {
    next();
  } else {
    res.status(401).json({ error: "Unauthorized" });
  }
};

// API для входа
app.post('/api/login', (req, res) => {
  const { password } = req.body;
  if (password === ADMIN_PASSWORD) {
    req.session.isLoggedIn = true;
    res.json({ success: true });
  } else {
    res.status(401).json({ error: "Wrong password" });
  }
});

// Получение списка пользователей
app.get('/api/users', checkAuth, async (req, res) => {
  try {
    const users = await User.find({}).sort({ level: -1 }).lean();
    res.json(users.map(u => ({
        _id: u._id,
        username: u.username || 'n/a',
        level: u.level || 1,
        exp: u.exp || 0,
        xp: u.xp || 0,
        messages: u.messages || 0,
        coins: u.coins || 0,
        essence: u.essence || 0,
        warns: u.warns || 0,
        commands_count: u.commands_count || 0,
        clan_id: u.clan_id || '',
        inventory: u.inventory || {},
        resources: u.resources || {},
        skills: u.skills || {},
        cooldowns: u.cooldowns || {},
        achievements: u.achievements || [],
        pets: u.pets || [],
        ai_profile: u.ai_profile || {},
        ai_history: u.ai_history || [],
        ai_enabled: u.ai_enabled || false,
        // Добавляем флаги для фронтенда, если они есть в схеме
        is_vip: u.is_vip || false,
        is_admin: u.is_admin || false
    })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Получение VIP и Admin статуса (из отдельных коллекций)
app.get('/api/user-status/:id', checkAuth, async (req, res) => {
    try {
        const userId = parseInt(req.params.id);
        const db = mongoose.connection.db;
        const isAdmin = await db.collection('admins').findOne({ _id: userId });
        const vipDoc = await db.collection('vips').findOne({ user_id: userId });
        res.json({
            isAdmin: !!isAdmin,
            isVip: !!vipDoc,
            vipExpires: vipDoc ? vipDoc.expires_at : null
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Назначение VIP (с синхронизацией в документ юзера для бота)
app.post('/api/set-vip', checkAuth, async (req, res) => {
    try {
        const { user_id, days } = req.body;
        const uid = parseInt(user_id);
        const db = mongoose.connection.db;
        const expires = new Date();
        expires.setDate(expires.getDate() + parseInt(days));

        // 1. Обновляем спец. коллекцию vips
        await db.collection('vips').updateOne(
            { user_id: uid },
            { $set: { _id: `id_${uid}`, user_id: uid, added_at: new Date(), expires_at: expires } },
            { upsert: true }
        );

        // 2. СИНХРОНИЗАЦИЯ: Обновляем самого юзера, чтобы бот сразу увидел VIP
        await User.updateOne({ _id: uid }, { 
            $set: { 
                is_vip: true, 
                vip_until: expires 
            } 
        });

        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Управление админами (с синхронизацией)
app.post('/api/set-admin', checkAuth, async (req, res) => {
    try {
        const { user_id, action } = req.body;
        const uid = parseInt(user_id);
        const db = mongoose.connection.db;
        const isAdding = (action === 'add');

        // 1. Обновляем коллекцию admins
        if (isAdding) {
            await db.collection('admins').updateOne({ _id: uid }, { $set: { _id: uid } }, { upsert: true });
        } else {
            await db.collection('admins').deleteOne({ _id: uid });
        }

        // 2. СИНХРОНИЗАЦИЯ: Обновляем поле is_admin в документе юзера
        await User.updateOne({ _id: uid }, { 
            $set: { is_admin: isAdding } 
        });

        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Универсальное обновление полей
app.post('/api/update', checkAuth, async (req, res) => {
  try {
    const { user_id, updateData } = req.body;
    // Используем модель User вместо прямого db.collection, чтобы работали валидации схемы
    await User.updateOne({ _id: user_id }, { $set: updateData });
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// --- KEEP ALIVE ---
const RENDER_URL = process.env.RENDER_EXTERNAL_URL;
if (RENDER_URL) {
  setInterval(async () => {
    try { await axios.get(RENDER_URL); } catch (e) {}
  }, 10 * 60 * 1000);
}

app.listen(port, () => console.log(`🚀 Server started on port ${port}`));
