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

// --- ПОДКЛЮЧЕНИЕ К БАЗЕ ДАННЫХ (ЭТОГО НЕ ХВАТАЛО) ---
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ Connected to MongoDB Atlas'))
  .catch(err => {
    console.error('❌ MongoDB Connection Error:', err.message);
    // Если база не подключилась, нет смысла запускать сервер
  });

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

app.use(session({
  secret: 'chronos-secret-key',
  resave: false,
  saveUninitialized: false, // Рекомендуется false для сессий
  cookie: { 
    maxAge: 24 * 60 * 60 * 1000,
    secure: false // Для HTTP (на Render по умолчанию так)
  }
}));

// Проверка авторизации
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

app.get('/api/users', checkAuth, async (req, res) => {
  try {
    // .lean() возвращает чистые объекты из БД, не фильтруя их по схеме
    const users = await User.find({}).sort({ level: -1 }).lean();

    res.json(users.map(u => {
      return {
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

        // Благодаря .lean() и strict:false эти поля больше не будут пустыми:
        inventory: u.inventory || {},
        resources: u.resources || {},
        skills: u.skills || {},
        cooldowns: u.cooldowns || {},
        achievements: u.achievements || [],
        pets: u.pets || [],

        ai_profile: u.ai_profile || {},
        ai_history: u.ai_history || [],
        ai_enabled: u.ai_enabled || false
      };
    }));
  } catch (err) {
    console.error("Ошибка API:", err);
    res.status(500).json({ error: err.message });
  }
});

// Роут для получения статусов (VIP и Админ)
app.get('/api/user-status/:id', checkAuth, async (req, res) => {
    try {
        const userId = parseInt(req.params.id);
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

// Роут для назначения VIP
app.post('/api/set-vip', checkAuth, async (req, res) => {
    try {
        const { user_id, days } = req.body;
        const uid = parseInt(user_id);
        const expires = new Date();
        expires.setDate(expires.getDate() + parseInt(days));

        await db.collection('vips').updateOne(
            { user_id: uid },
            { 
                $set: { 
                    _id: `id_${uid}`,
                    user_id: uid,
                    added_at: new Date(),
                    added_by: 5059523895, // ID админа (можно брать из сессии)
                    expires_at: expires
                } 
            },
            { upsert: true }
        );
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Роут для назначения Админа
app.post('/api/set-admin', checkAuth, async (req, res) => {
    try {
        const { user_id, action } = req.body; // action: 'add' или 'remove'
        const uid = parseInt(user_id);

        if (action === 'add') {
            await db.collection('admins').updateOne({ _id: uid }, { $set: { _id: uid } }, { upsert: true });
        } else {
            await db.collection('admins').deleteOne({ _id: uid });
        }
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/update', checkAuth, async (req, res) => {
  try {
    const { user_id, updateData } = req.body;
    // Используем динамический $set, чтобы можно было обновлять вложенные поля через точку
    // Например: "ai_profile.name": "Nova"
    await db.collection('users').updateOne(
      { _id: user_id }, 
      { $set: updateData }
    );
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// --- ФУНКЦИЯ АНТИ-СОН (KEEP ALIVE) ---
const RENDER_URL = process.env.RENDER_EXTERNAL_URL;
if (RENDER_URL) {
  setInterval(async () => {
    try {
      await axios.get(RENDER_URL);
      console.log('📡 Self-ping successful');
    } catch (e) {
      console.error('📡 Ping error:', e.message);
    }
  }, 10 * 60 * 1000); // 10 минут
}

app.listen(port, () => console.log(`🚀 Server started on port ${port}`));
