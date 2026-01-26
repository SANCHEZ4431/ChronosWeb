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

// Защищенные роуты
app.get('/api/users', checkAuth, async (req, res) => {
  try {
    // 1. Берем всех пользователей из базы
    const users = await User.find({}).sort({ level: -1 });

    // 2. Отправляем ПОЛНЫЕ объекты, а не только обрезанную часть
    res.json(users.map(u => {
      // Превращаем документ Mongoose в обычный объект, чтобы с ним было легче работать
      const userObj = u.toObject();

      return {
        // Системное
        _id: userObj._id,
        user_id: userObj._id, // для совместимости
        username: userObj.username || 'n/a',
        chat_id: userObj.chat_id,
        
        // Основные статы
        level: userObj.level || 1,
        exp: userObj.exp || 0,
        xp: userObj.xp || 0,
        messages: userObj.messages || 0,
        coins: userObj.coins || 0,
        essence: userObj.essence || 0,
        warns: userObj.warns || 0,
        commands_count: userObj.commands_count || 0,
        clan_id: userObj.clan_id,

        // СЛОЖНЫЕ СТРУКТУРЫ (передаем целиком)
        inventory: userObj.inventory || {},
        resources: userObj.resources || {},
        skills: userObj.skills || {},
        cooldowns: userObj.cooldowns || {},
        achievements: userObj.achievements || [],
        pets: userObj.pets || [],
        referrals: userObj.referrals || [],

        // ИИ ПРОФИЛЬ (всё: от квестов до истории)
        ai_profile: userObj.ai_profile || {},
        ai_history: userObj.ai_history || [],
        ai_access: userObj.ai_access,
        ai_enabled: userObj.ai_enabled,

        // Тайминги
        last_daily: userObj.last_daily,
        cooldown_buffer_until: userObj.cooldown_buffer_until
      };
    }));
  } catch (err) {
    console.error("Ошибка API:", err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/users', checkAuth, async (req, res) => {
  try {
    const users = await db.collection('users').find({}).toArray();
    // Отправляем всё "как есть", чтобы фронт видел полную структуру
    res.json(users);
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
