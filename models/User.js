const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true
  },
  passwordHash: {
    type: String,
    required: true
  },
  role: {
    type: String,
    enum: ['admin', 'caregiver', 'user'],
    default: 'user'
  },
  deviceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Device'
  },
  lastLoginAt: Date
}, {
  timestamps: true // adds createdAt, updatedAt
});

module.exports = mongoose.model('User', UserSchema);
