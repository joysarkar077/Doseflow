const mongoose = require('mongoose');

const DeviceSchema = new mongoose.Schema({
  deviceName: {
    type: String,
    required: true
  },
  deviceApiKey: {
    type: String,
    required: true
  },
  wifi: {
    ssid: String,
    password: String, // encrypted
    lastUpdated: Date
  },
  snoozeTimerMinutes: {
    type: Number,
    default: 10
  },
  scheduleWindowMinutes: {
    type: Number,
    default: 30
  },
  lidWarningMinutes: {
    type: Number,
    default: 35
  },
  status: {
    online: Boolean,
    lastSeenAt: Date,
    lastKnownIp: String
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Device', DeviceSchema);
