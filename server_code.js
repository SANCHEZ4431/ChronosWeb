const express = require('express');
const bcrypt = require('bcryptjs');
const cors = require('cors');
const fs = require('fs');
const moment = require('moment');
const mongoose = require('mongoose');
const MongoStore = require('connect-mongo');
const session = require('express-session');
const crypto = require('crypto');
const multer = require('multer');
const path = require('path');
const fsExtra = require('fs-extra');
const { google } = require('googleapis');
const User = require('./models/data'); // Твоя новая модель для Chronos
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

const http = require('http').createServer(app);
const { Server } = require('socket.io');
const io = new Server(http, {
  cors: { origin: '*' }
});

// === Socket.io (Твой чат) ===
const chatUsers = new Map();
io.on('connection', socket => {
  socket.on('registerUser', (username) => {
    chatUsers.set(username, socket);
    socket.username = username;
  });
  socket.on('sendMessage', ({ to, from, message }) => {
    if (chatUsers.has(to)) {
      chatUsers.get(to).emit('receiveMessage', { from, message });
    }
  });
  socket.on('disconnect', () => {
    if (socket.username) chatUsers.delete(socket.username);
  });
});

// === Настройки ===
app.use(cors());
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// === MongoDB Connection ===
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('Connected to Chronos MongoDB Atlas'))
  .catch(err => console.error('MongoDB error:', err));

// === Сессии ===
app.use(session({
  secret: process.env.SESSION_SECRET || 'chronos_secret_key',
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({
    mongoUrl: process.env.MONGO_URI,
    collectionName: 'sessions'
  })
}));

// === Google Drive & Encryption Helpers (Твои оригинальные) ===
function xorDecrypt(bytes, mask) { return bytes.map(b => b ^ mask); }

function getKeyAndIV() {
  const encryptedKeyBytes = process.env.ENCRYPTED_KEY_BYTES.split(',').map(Number);
  const encryptedIVBytes = process.env.ENCRYPTED_IV_BYTES.split(',').map(Number);
  const mask = parseInt(process.env.XOR_MASK);
  return {
    key: Buffer.from(xorDecrypt(encryptedKeyBytes, mask)),
    iv: Buffer.from(xorDecrypt(encryptedIVBytes, mask))
  };
}

// === API ДЛЯ АДМИН ПАНЕЛИ CHRONOS ===

// 1. Получение списка всех юзеров из бота
app.get('/api/users', async (req, res) => {
  try {
    const users = await User.find({}).sort({ level: -1 });
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: 'Ошибка получения данных' });
  }
});

// 2. Бан пользователя (по user_id бота)
app.post('/api/ban', async (req, res) => {
  const { user_id, reason } = req.body;
  try {
    await User.findOneAndUpdate(
      { user_id: parseInt(user_id) },
      { is_banned: true, ban_reason: reason }
    );
    res.json({ success: true, message: 'Пользователь забанен' });
  } catch (err) {
    res.status(500).json({ success: false });
  }
});

// 3. Разбан
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

// 4. Редактирование ресурсов (Монеты/Эссенция)
app.post('/api/edit-resources', async (req, res) => {
    const { user_id, coins, essence } = req.body;
    try {
        await User.findOneAndUpdate(
            { user_id: parseInt(user_id) },
            { $set: { coins: parseInt(coins), essence: parseInt(essence) } }
        );
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// === ТВОИ ОРИГИНАЛЬНЫЕ РОУТЫ (Логи, Дешифровка) ===

app.post('/admin-login', (req, res) => {
  const { username, password } = req.body;
  if (username === process.env.ADMIN_USERNAME && password === process.env.ADMIN_PASSWORD) {
    req.session.adminLoggedIn = true;
    res.redirect('/admin');
  } else {
    res.send('Ошибка входа');
  }
});

app.get('/admin', (req, res) => {
  req.session.adminLoggedIn 
    ? res.sendFile(path.join(__dirname, 'public', 'admin.html')) 
    : res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.post('/api/decrypt', (req, res) => {
  const { lines } = req.body;
  const { key, iv } = getKeyAndIV();
  try {
    const decrypted = lines.map(line => {
      const decipher = crypto.createDecipheriv('aes-128-cbc', key, iv);
      return decipher.update(Buffer.from(line, 'base64'), null, 'utf8') + decipher.final('utf8');
    });
    res.json({ decrypted });
  } catch (err) {
    res.status(500).json({ error: 'Ошибка дешифровки' });
  }
});

// === Запуск ===
http.listen(port, () => {
  console.log(`Админ-панель Chronos запущена на порту ${port}`);
});
