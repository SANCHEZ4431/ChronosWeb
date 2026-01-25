const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  _id: Number, // В боте используется _id как Telegram ID
  username: String,
  level: { type: Number, default: 1 },
  exp: { type: Number, default: 0 },
  coins: { type: Number, default: 0 },
  essence: { type: Number, default: 0 },
  messages: { type: Number, default: 0 },
  warns: { type: Number, default: 0 },
  commands_count: { type: Number, default: 0 },
  // Поля навыков (skills)
  skills: {
    exp_boost: Number,
    resource_gain: Number,
    luck: Number,
    gold_gain: Number,
    wisdom: Number
  },
  // Поля ИИ
  ai_enabled: Boolean,
  ai_profile: {
    name: String,
    relationship_level: Number,
    mood: String
  }
}, { 
  collection: 'users',
  versionKey: false 
});

module.exports = mongoose.model('User', userSchema);
