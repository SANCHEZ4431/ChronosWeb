const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  user_id: { type: Number, required: true, unique: true },
  username: String,
  first_name: String,
  level: { type: Number, default: 1 },
  exp: { type: Number, default: 0 },
  coins: { type: Number, default: 0 },
  essence: { type: Number, default: 0 },
  is_banned: { type: Boolean, default: false },
  ban_reason: String,
  is_vip: { type: Boolean, default: false }
}, { 
  collection: 'users' // Явно указываем коллекцию
});

// Четвертый аргумент в connect или настройка здесь для выбора БД
module.exports = mongoose.model('User', userSchema);
