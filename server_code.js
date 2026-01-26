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

// Настройка сессий
app.use(session({
  secret: 'chronos-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: { 
    maxAge: 24 * 60 * 60 * 1000,
    secure: false 
  }
}));

// --- ПРОВЕРКА ВХОДА (LOGIN REDIRECT) ---
app.get('/', (req, res) => {
    if (req.session.isLoggedIn) {
        res.sendFile(path.join(__dirname, 'public', 'index.html'));
    } else {
        res.redirect('/login.html');
    }
});

// Раздача статики после проверки корня
app.use(express.static('public'));

// Middleware для защиты API
const checkAuth = (req, res, next) => {
  if (req.session.isLoggedIn) {
    next();
  } else {
    res.status(401).json({ error: "Unauthorized" });
  }
};

// --- API МАРШРУТЫ ---

// Логин на сайт
app.post('/api/login', (req, res) => {
  const { password } = req.body;
  if (password === ADMIN_PASSWORD) {
    req.session.isLoggedIn = true;
    res.json({ success: true });
  } else {
    res.status(401).json({ error: "Wrong password" });
  }
});

// Получение списка всех юзеров
app.get('/api/users', checkAuth, async (req, res) => {
  try {
    const users = await User.find({}).sort({ level: -1 }).lean();
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Получение детального статуса (VIP/Admin) из коллекций
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

// ВЫДАЧА VIP (Обновляет коллекцию vips И флаг в users)
app.post('/api/set-vip', checkAuth, async (req, res) => {
    try {
        const { user_id, days } = req.body;
        const uid = parseInt(user_id);
        const db = mongoose.connection.db;
        const expires = new Date();
        expires.setDate(expires.getDate() + parseInt(days));

        // 1. Обновляем коллекцию vips (для технических проверок)
        await db.collection('vips').updateOne(
            { user_id: uid },
            { $set: { _id: `id_${uid}`, user_id: uid, added_at: new Date(), expires_at: expires } },
            { upsert: true }
        );

        // 2. Обновляем поле в коллекции users (для отображения на сайте/в боте)
        await User.updateOne({ _id: uid }, { 
            $set: { is_vip: true, vip_until: expires } 
        });

        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// УПРАВЛЕНИЕ АДМИНАМИ (Обновляет коллекцию admins И флаг в users)
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

        // 2. Обновляем флаг в коллекции users
        await User.updateOne({ _id: uid }, { 
            $set: { is_admin: isAdding } 
        });

        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Универсальное обновление данных юзера
app.post('/api/update', checkAuth, async (req, res) => {
  try {
    const { user_id, updateData } = req.body;
    // Используем модель User для корректного обновления
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
