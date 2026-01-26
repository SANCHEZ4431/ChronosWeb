require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const User = require('./models/data');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

mongoose.connect(process.env.MONGO_URI).then(() => console.log('✅ DB Connected'));

// Получение списка
app.get('/api/users', async (req, res) => {
  try {
    const users = await User.find({}).sort({ level: -1 });
    const formatted = users.map(u => ({
      user_id: u._id,
      username: u.username || 'n/a',
      level: u.level,
      exp: u.exp,
      coins: u.coins,
      essence: u.essence,
      warns: u.warns,
      wisdom: u.skills?.wisdom || 0,
      ai_name: u.ai_profile?.name || 'Hikari'
    }));
    res.json(formatted);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Редактирование данных
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

app.listen(process.env.PORT || 3000, () => console.log('🚀 Server running'));
