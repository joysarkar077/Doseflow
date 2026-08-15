const express = require('express');
const router = express.Router();
const authUser = require('../middleware/authUser');
const Log = require('../models/Log');

// @route   GET api/logs
// @desc    Get logs for user's device
// @access  Private
router.get('/', authUser, async (req, res) => {
  try {
    const { range, from, to } = req.query;
    let query = { deviceId: req.user.deviceId };
    
    let startDate = new Date();
    let endDate = new Date();

    if (range === 'week') {
      const day = startDate.getDay();
      const diff = startDate.getDate() - day + (day == 0 ? -6:1); // adjust when day is sunday
      startDate = new Date(startDate.setDate(diff));
      startDate.setHours(0,0,0,0);
      endDate = new Date();
    } else if (from && to) {
      startDate = new Date(from);
      endDate = new Date(to);
    } else {
      // Default to last 7 days if nothing specific is provided
      startDate.setDate(startDate.getDate() - 7);
    }
    
    query.timestamp = { $gte: startDate, $lte: endDate };

    const logs = await Log.find(query)
      .populate('scheduleId', 'slotName')
      .populate('medicineId', 'name')
      .sort({ timestamp: -1 });

    res.json(logs);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

module.exports = router;
