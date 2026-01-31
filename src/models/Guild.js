const mongoose = require('mongoose');

const guildSchema = new mongoose.Schema({
  guildId: {
    type: String,
    required: true,
    unique: true
  },
  
  antiNuke: {
    enabled: {
      type: Boolean,
      default: true
    },
    maxChannelDeletes: {
      type: Number,
      default: 3
    },
    maxRoleDeletes: {
      type: Number,
      default: 3
    },
    maxBans: {
      type: Number,
      default: 3
    }
  },
  
  antiSpam: {
    enabled: {
      type: Boolean,
      default: true
    },
    messageLimit: {
      type: Number,
      default: 5
    },
    timeWindow: {
      type: Number,
      default: 5000
    }
  },
  
  logging: {
    enabled: {
      type: Boolean,
      default: true
    },
    channels: {
      discord: String,
      seguridad: String,
      baneos: String,
      timeout: String,
      roles: String,
      joins: String,
      left: String
    }
  },
  
  createdAt: {
    type: Date,
    default: Date.now
  },
  
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Actualizar updatedAt antes de cada save
guildSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Guild', guildSchema);
