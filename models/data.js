const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  user_id: { type: Number, required: true, unique: true }, // Из бота
  username: String,
  first_name: String,
  
  // Игровые данные (из rpg_users в main.py)
  level: { type: Number, default: 1 },
  exp: { type: Number, default: 0 },
  coins: { type: Number, default: 0 },
  essence: { type: Number, default: 0 },
  
  // Статусы
  is_banned: { type: Boolean, default: false },
  ban_reason: String,
  is_vip: { type: Boolean, default: false },
  
  // Логика из вашего старого кода
  awaitingLogUpload: { type: Boolean, default: false }
});

module.exports = mongoose.model('User', userSchema, 'users');
