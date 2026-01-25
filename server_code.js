const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const User = require('./models/data');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public')); // Папка, где лежит ваш HTML

// Подключение к MongoDB (AssetViewer Cluster)
// MONGO_URI в .env должен быть: mongodb+srv://user:pass@assetviewer.xxxx.mongodb.net/telegram_bot
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('Успешное подключение к кластеру AssetViewer [База: telegram_bot]'))
  .catch(err => console.error('Ошибка подключения к MongoDB:', err));

// --- API Роуты ---

// Получить всех пользователей
app.get('/api/users', async (req, res) => {
  try {
    const users = await User.find({}).sort({ level: -1 });
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: 'Ошибка БД' });
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

// Главная страница админки
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(port, () => {
  console.log(`Сервер Chronos запущен на http://localhost:${port}`);
});
