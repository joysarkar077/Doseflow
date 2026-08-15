const mongoose = require('mongoose');

const ScheduleSchema = new mongoose.Schema({
  deviceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Device',
    required: true
  },
  slotName: {
    type: String,
    required: true
  },
  slotOrder: {
    type: Number,
    required: true
  },
  timeStart: {
    type: String, // HH:MM
    required: true
  },
  timeEnd: {
    type: String // HH:MM
  },
  isDefault: {
    type: Boolean,
    default: false
  },
  active: {
    type: Boolean,
    default: true
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

ScheduleSchema.index({ deviceId: 1, slotOrder: 1 });

// Update lastUpdated on save
ScheduleSchema.pre('save', function() {
  this.lastUpdated = new Date();
});

module.exports = mongoose.model('Schedule', ScheduleSchema);
