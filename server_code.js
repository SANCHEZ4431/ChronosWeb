require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const User = require('./models/data');

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Подключение к MongoDB через переменную окружения Render
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ Connected to Chronos DB (AssetViewer)'))
  .catch(err => console.error('❌ DB Connection Error:', err));

// Основной API для получения данных всех игроков
app.get('/api/users', async (req, res) => {
  try {
    // Получаем всех пользователей, сортируем по уровню (от большего к меньшему)
    const users = await User.find({});
    
    // Форматируем данные перед отправкой, чтобы фронтенду было удобно
    const formattedUsers = users.map(u => ({
      user_id: u._id,
      username: u.username || 'n/a',
      level: u.level || 1,
      exp: u.exp || 0,
      coins: u.coins || 0,
      essence: u.essence || 0,
      warns: u.warns || 0,
      commands: u.commands_count || 0,
      // Собираем основные навыки в строку или объект
      luck: u.skills?.luck || 0,
      wisdom: u.skills?.wisdom || 0,
      ai_name: u.ai_profile?.name || 'Hikari'
    }));

    res.json(formattedUsers);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Роут для главной страницы
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(port, () => {
  console.log(`🚀 Chronos Data Server running on port ${port}`);
});
