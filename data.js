const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  // В вашем боте _id — это Telegram ID (Int64). 
  // Мы используем Number, но разрешаем любые типы через strict: false
  _id: Number, 
  
  username: String,
  level: { type: Number, default: 1 },
  exp: { type: Number, default: 0 },
  xp: { type: Number, default: 0 }, // В базе есть и exp, и xp
  coins: { type: Number, default: 0 },
  essence: { type: Number, default: 0 },
  messages: { type: Number, default: 0 },
  warns: { type: Number, default: 0 },
  commands_count: { type: Number, default: 0 },
  clan_id: String,

  // Навыки (описываем основные, остальные подтянутся автоматически)
  skills: {
    exp_boost: { type: Number, default: 0 },
    resource_gain: { type: Number, default: 0 },
    luck: { type: Number, default: 0 },
    gold_gain: { type: Number, default: 0 },
    wisdom: { type: Number, default: 0 },
    cooldown_reduction: { type: Number, default: 0 },
    pet_bonus: { type: Number, default: 0 },
    blessing_power: { type: Number, default: 0 },
    expedition_speed: { type: Number, default: 0 },
    artifact_luck: { type: Number, default: 0 }
  },

  // ИИ Профиль
  ai_enabled: { type: Boolean, default: false },
  ai_access: { type: Boolean, default: false },
  ai_profile: {
    name: { type: String, default: "Nova" },
    age: Number,
    gender: String,
    relationship_level: { type: Number, default: 0 },
    mood: String,
    speech_style: String,
    personality: String
  },
  
  // История чата с ИИ
  ai_history: Array,

  // Ресурсы
  resources: {
    gold: { type: Number, default: 0 },
    wood: { type: Number, default: 0 },
    stone: { type: Number, default: 0 },
    iron: { type: Number, default: 0 },
    magic_crystals: { type: Number, default: 0 },
    ores: { type: Number, default: 0 },
    fabric: { type: Number, default: 0 },
    food: { type: Number, default: 0 },
    rare_artifacts: { type: Number, default: 0 }
  },

  // Инвентарь (Object, так как ключи — названия предметов)
  inventory: { type: mongoose.Schema.Types.Mixed, default: {} },

  // Массивы достижений и питомцев
  achievements: [String],
  pets: [String],

  // Системные поля (кулдауны и т.д.)
  cooldowns: { type: mongoose.Schema.Types.Mixed, default: {} },
  last_daily: Date,
  cooldown_buffer_until: Date,
  // Статусы доступа (если бот проверяет их прямо в документе юзера)
  is_admin: { type: Boolean, default: false },
  is_vip: { type: Boolean, default: false },
  vip_until: { type: Date, default: null },

  // Дополнительные поля, которые часто используются в ботах для отображения
  is_banned: { type: Boolean, default: false },
  ban_reason: String,

}, { 
  collection: 'users', // Убедитесь, что коллекция называется именно так
  versionKey: false,
  strict: false // КРИТИЧЕСКИ ВАЖНО: позволяет работать с полями, не описанными выше
});

// Добавляем метод для красивого вывода ID (на случай $numberLong)
userSchema.set('toJSON', { getters: true });
userSchema.set('toObject', { getters: true });

module.exports = mongoose.model('User', userSchema);
