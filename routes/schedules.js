const express = require('express');
const router = express.Router();
const { check, validationResult } = require('express-validator');
const authUser = require('../middleware/authUser');
const Schedule = require('../models/Schedule');
const Medicine = require('../models/Medicine');

// @route   GET api/schedules
// @desc    Get all schedules for user's device
// @access  Private
router.get('/', authUser, async (req, res) => {
  try {
    const schedules = await Schedule.find({ deviceId: req.user.deviceId }).sort({ slotOrder: 1 });
    res.json(schedules);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   POST api/schedules
// @desc    Add new schedule slot
// @access  Private
router.post(
  '/',
  authUser,
  check('slotName', 'Slot name is required').not().isEmpty(),
  check('timeStart', 'Time start is required').not().isEmpty(),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    try {
      const { timeStart } = req.body;
      const allSchedules = await Schedule.find({ deviceId: req.user.deviceId });
      
      const parseTime = (timeStr) => {
        const [hours, mins] = timeStr.split(':').map(Number);
        return hours * 60 + mins;
      };
      
      const newTime = parseTime(timeStart);
      for (let sch of allSchedules) {
        const existingTime = parseTime(sch.timeStart);
        const diff = Math.abs(newTime - existingTime);
        const minDiff = Math.min(diff, 1440 - diff); // Account for midnight wrap-around
        if (minDiff < 30) {
          return res.status(400).json({ message: `Cannot set schedule within 30 minutes of existing schedule (${sch.timeStart})` });
        }
      }

      // Find the highest slot order
      const highestSlot = await Schedule.findOne({ deviceId: req.user.deviceId }).sort('-slotOrder');
      const newSlotOrder = highestSlot ? highestSlot.slotOrder + 1 : 0;

      const newSchedule = new Schedule({
        deviceId: req.user.deviceId,
        slotName: req.body.slotName,
        timeStart: req.body.timeStart,
        timeEnd: req.body.timeEnd,
        slotOrder: newSlotOrder,
        isDefault: false
      });

      const schedule = await newSchedule.save();
      res.json(schedule);
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server Error');
    }
  }
);

// @route   PUT api/schedules/:id
// @desc    Update schedule slot
// @access  Private
router.put('/:id', authUser, async (req, res) => {
  try {
    let schedule = await Schedule.findById(req.params.id);

    if (!schedule) return res.status(404).json({ message: 'Schedule not found' });
    if (schedule.deviceId.toString() !== req.user.deviceId.toString()) {
      return res.status(401).json({ message: 'Not authorized' });
    }

    // Default schedules can't have their name changed, but can change time and active status
    const updateFields = {};
    if (req.body.timeStart) {
      const parseTime = (timeStr) => {
        const [hours, mins] = timeStr.split(':').map(Number);
        return hours * 60 + mins;
      };
      
      const newTime = parseTime(req.body.timeStart);
      const allSchedules = await Schedule.find({ deviceId: req.user.deviceId, _id: { $ne: req.params.id } });
      
      for (let sch of allSchedules) {
        const existingTime = parseTime(sch.timeStart);
        const diff = Math.abs(newTime - existingTime);
        const minDiff = Math.min(diff, 1440 - diff);
        if (minDiff < 30) {
          return res.status(400).json({ message: `Cannot set schedule within 30 minutes of existing schedule (${sch.timeStart})` });
        }
      }
      updateFields.timeStart = req.body.timeStart;
    }
    
    if (req.body.timeEnd) updateFields.timeEnd = req.body.timeEnd;
    if (typeof req.body.active === 'boolean') updateFields.active = req.body.active;
    if (!schedule.isDefault && req.body.slotName) updateFields.slotName = req.body.slotName;

    schedule = await Schedule.findByIdAndUpdate(
      req.params.id,
      { $set: updateFields },
      { new: true }
    );

    res.json(schedule);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   DELETE api/schedules/:id
// @desc    Delete schedule slot
// @access  Private
router.delete('/:id', authUser, async (req, res) => {
  try {
    let schedule = await Schedule.findById(req.params.id);

    if (!schedule) return res.status(404).json({ message: 'Schedule not found' });
    if (schedule.deviceId.toString() !== req.user.deviceId.toString()) {
      return res.status(401).json({ message: 'Not authorized' });
    }

    if (schedule.isDefault) {
      return res.status(400).json({ message: 'Cannot delete default schedules' });
    }

    await Schedule.findByIdAndDelete(req.params.id);

    // Remove this schedule from all medicines' dosePattern
    await Medicine.updateMany(
      { deviceId: schedule.deviceId },
      { $pull: { dosePattern: { scheduleId: req.params.id } } }
    );

    res.json({ message: 'Schedule removed' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

module.exports = router;
