require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const axios = require('axios'); // Нужно установить: npm install axios
const User = require('./data');

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

mongoose.connect(process.env.MONGO_URI).then(() => console.log('✅ DB Connected'));

// --- API ДАННЫХ ---
app.get('/api/users', async (req, res) => {
  try {
    const users = await User.find({}).sort({ level: -1 });
    const formatted = users.map(u => ({
      user_id: u._id,
      username: u.username || 'n/a',
      level: u.level || 1,
      exp: u.exp || 0,
      coins: u.coins || 0,
      essence: u.essence || 0,
      warns: u.warns || 0,
      wisdom: u.skills?.wisdom || 0,
      ai_name: u.ai_profile?.name || 'Hikari'
    }));
    res.json(formatted);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/update', async (req, res) => {
  const { user_id, coins, essence, level, exp, warns } = req.body;
  try {
    await User.findByIdAndUpdate(user_id, {
      $set: { 
        coins: parseInt(coins), 
        essence: parseInt(essence), 
        level: parseInt(level),
        exp: parseInt(exp),
        warns: parseInt(warns)
      }
    });
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// --- ФУНКЦИЯ "АНТИ-СОН" (KEEP ALIVE) ---
const RENDER_EXTERNAL_URL = process.env.RENDER_EXTERNAL_URL; // Render сам подставляет эту переменную

function keepAlive() {
  if (!RENDER_EXTERNAL_URL) {
    console.log("⚠️ RENDER_EXTERNAL_URL не найден, самопрозвон отключен.");
    return;
  }
  setInterval(async () => {
    try {
      await axios.get(RENDER_EXTERNAL_URL);
      console.log(`📡 Ping successful: ${RENDER_EXTERNAL_URL}`);
    } catch (e) {
      console.error("❌ Ping failed:", e.message);
    }
  }, 10 * 60 * 1000); // Пинг каждые 10 минут
}

app.listen(port, () => {
  console.log(`🚀 Server running on port ${port}`);
  keepAlive(); // Запускаем цикл пинга при старте сервера
});
