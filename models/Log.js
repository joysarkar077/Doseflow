const mongoose = require('mongoose');

const LogSchema = new mongoose.Schema({
  deviceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Device',
    required: true
  },
  scheduleId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Schedule',
    default: null
  },
  medicineId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Medicine',
    default: null
  },
  eventType: {
    type: String,
    enum: [
      'reminder_due', 'snoozed', 'lid_opened', 'lid_closed', 
      'user_confirmed', 'missed', 'unscheduled_access', 
      'sensor_disagreement', 'lid_left_open_warning'
    ],
    required: true
  },
  timestamp: {
    type: Date,
    required: true
  },
  receivedAt: {
    type: Date,
    default: Date.now
  },
  sequenceId: {
    type: Number,
    required: true
  },
  note: {
    type: String
  }
});

LogSchema.index({ deviceId: 1, sequenceId: 1 }, { unique: true });
LogSchema.index({ deviceId: 1, timestamp: -1 });

module.exports = mongoose.model('Log', LogSchema);
