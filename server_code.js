const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const session = require('express-session');
const MongoStore = require('connect-mongo');
require('dotenv').config();

const User = require('./data');

const app = express();
const port = process.env.PORT || 3000;
const MONGO_URI = "mongodb+srv://SANCHEZ4431:KALENDAR4431@assetviewer.sikwig9.mongodb.net/telegram_bot?retryWrites=true&w=majority&appName=AssetViewer";

// === Middleware ===
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// === Подключение к MongoDB ===
mongoose.connect(MONGO_URI)
  .then(() => console.log('✅ Connected to AssetViewer: telegram_bot database'))
  .catch(err => console.error('❌ MongoDB connection error:', err));

// === Сессии ===
app.use(session({
  secret: 'chronos_secret_777',
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({ mongoUrl: MONGO_URI })
}));

// === API Routes ===

// Получить всех пользователей
app.get('/api/users', async (req, res) => {
  try {
    const users = await User.find({}).sort({ level: -1 });
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: 'Database error' });
  }
});

// Бан пользователя
app.post('/api/ban', async (req, res) => {
  const { user_id, reason } = req.body;
  try {
    await User.findOneAndUpdate(
      { user_id: parseInt(user_id) },
      { is_banned: true, ban_reason: reason || 'Нарушение правил' }
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false });
  }
});

// Разбан
app.post('/api/unban', async (req, res) => {
  const { user_id } = req.body;
  try {
    await User.findOneAndUpdate(
      { user_id: parseInt(user_id) },
      { is_banned: false, ban_reason: '' }
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false });
  }
});

// Запуск сервера
app.listen(port, () => {
  console.log(`🚀 Chronos Admin Panel ready at http://localhost:${port}`);
});
