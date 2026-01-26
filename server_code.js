require('dotenv').config();
const express = require('express');
const session = require('express-session');
const mongoose = require('mongoose');
const axios = require('axios');
const path = require('path');
const User = require('./data');

const app = express();
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "12345"; // Установи свой пароль в переменных Render

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

app.use(session({
  secret: 'chronos-secret-key',
  resave: false,
  saveUninitialized: true,
  cookie: { maxAge: 24 * 60 * 60 * 1000 } // Сессия на 24 часа
}));

// Проверка авторизации
const checkAuth = (req, res, next) => {
  if (req.session.isLoggedIn) next();
  else res.status(401).json({ error: "Unauthorized" });
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
});

app.post('/api/update', checkAuth, async (req, res) => {
  const { user_id, coins, essence, level, exp, warns } = req.body;
  await User.findByIdAndUpdate(user_id, {
    $set: { coins, essence, level, exp, warns }
  });
  res.json({ success: true });
});

app.listen(process.env.PORT || 3000, () => console.log('🚀 Server started'));
