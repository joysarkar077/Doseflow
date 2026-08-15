const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const authUser = require('../middleware/authUser');
const Device = require('../models/Device');
const User = require('../models/User');

const algorithm = 'aes-256-cbc';

const encrypt = (text) => {
  if (!text) return text;
  const iv = crypto.randomBytes(16);
  const key = Buffer.from(process.env.WIFI_ENCRYPTION_KEY, 'utf8');
  const cipher = crypto.createCipheriv(algorithm, key, iv);
  let encrypted = cipher.update(text);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return iv.toString('hex') + ':' + encrypted.toString('hex');
};

// @route   GET api/device/wifi
// @desc    Get WiFi SSID
// @access  Private
router.get('/wifi', authUser, async (req, res) => {
  try {
    const device = await Device.findById(req.user.deviceId);
    if (!device) return res.status(404).json({ message: 'Device not found' });
    
    // Never send the password back to the frontend
    res.json({
      ssid: device.wifi ? device.wifi.ssid : '',
      lastUpdated: device.wifi ? device.wifi.lastUpdated : null
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   PUT api/device/wifi
// @desc    Update WiFi credentials
// @access  Private
router.put('/wifi', authUser, async (req, res) => {
  try {
    const device = await Device.findById(req.user.deviceId);
    if (!device) return res.status(404).json({ message: 'Device not found' });

    device.wifi = {
      ssid: req.body.ssid,
      password: encrypt(req.body.password),
      lastUpdated: new Date()
    };

    await device.save();
    res.json({ message: 'WiFi credentials updated' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   GET api/device/snooze
// @desc    Get snooze timer
// @access  Private
router.get('/snooze', authUser, async (req, res) => {
  try {
    const device = await Device.findById(req.user.deviceId);
    res.json({ snoozeTimerMinutes: device.snoozeTimerMinutes });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   PUT api/device/snooze
// @desc    Update snooze timer
// @access  Private
router.put('/snooze', authUser, async (req, res) => {
  try {
    const device = await Device.findById(req.user.deviceId);
    device.snoozeTimerMinutes = req.body.snoozeTimerMinutes;
    await device.save();
    res.json({ snoozeTimerMinutes: device.snoozeTimerMinutes });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   GET api/device/profile
// @desc    Get user profile
// @access  Private
router.get('/profile', authUser, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-passwordHash');
    res.json(user);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   PUT api/device/profile
// @desc    Update user password
// @access  Private
router.put('/profile', authUser, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    
    if (req.body.password) {
      const salt = await bcrypt.genSalt(10);
      user.passwordHash = await bcrypt.hash(req.body.password, salt);
    }
    
    await user.save();
    res.json({ message: 'Profile updated' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

module.exports = router;
