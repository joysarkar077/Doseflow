const mongoose = require('mongoose');

const MedicineSchema = new mongoose.Schema({
  deviceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Device',
    required: true
  },
  name: {
    type: String,
    required: true
  },
  dosePattern: [{
    scheduleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Schedule'
    },
    quantity: {
      type: Number,
      default: 0
    }
  }],
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

MedicineSchema.index({ deviceId: 1, active: 1 });

MedicineSchema.pre('save', function() {
  this.lastUpdated = new Date();
});

module.exports = mongoose.model('Medicine', MedicineSchema);
