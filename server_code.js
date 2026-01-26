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
    const users = await User.find({}).sort({ level: -1 });
    res.json(users.map(u => ({
      user_id: u._id,
      username: u.username || 'n/a',
      level: u.level || 1,
      exp: u.exp || 0,
      coins: u.coins || 0,
      essence: u.essence || 0,
      warns: u.warns || 0,
      wisdom: u.skills?.wisdom || 0,
      ai_name: u.ai_profile?.name || 'Hikari'
    })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/update', checkAuth, async (req, res) => {
  try {
    const { user_id, coins, essence, level, exp, warns } = req.body;
    await User.findByIdAndUpdate(user_id, {
      $set: { 
        coins: Number(coins), 
        essence: Number(essence), 
        level: Number(level), 
        exp: Number(exp), 
        warns: Number(warns) 
      }
    });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
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
