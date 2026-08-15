const express = require('express');
const router = express.Router();
const authDevice = require('../middleware/authDevice');
const Schedule = require('../models/Schedule');
const Medicine = require('../models/Medicine');
const Log = require('../models/Log');
const crypto = require('crypto');

const algorithm = 'aes-256-cbc';

const decrypt = (text) => {
  if (!text) return text;
  let textParts = text.split(':');
  let iv = Buffer.from(textParts.shift(), 'hex');
  let encryptedText = Buffer.from(textParts.join(':'), 'hex');
  const key = Buffer.from(process.env.WIFI_ENCRYPTION_KEY, 'utf8');
  let decipher = crypto.createDecipheriv(algorithm, key, iv);
  let decrypted = decipher.update(encryptedText);
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  return decrypted.toString();
};

// @route   GET api/deviceApi/:deviceId/schedules
// @desc    Get active schedules for ESP32
// @access  Private (Device API Key)
router.get('/:deviceId/schedules', authDevice, async (req, res) => {
  try {
    const schedules = await Schedule.find({ deviceId: req.device._id, active: true })
      .select('slotName slotOrder timeStart timeEnd lastUpdated');
    res.json(schedules);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   GET api/deviceApi/:deviceId/medicines
// @desc    Get active medicines for ESP32
// @access  Private (Device API Key)
router.get('/:deviceId/medicines', authDevice, async (req, res) => {
  try {
    const medicines = await Medicine.find({ deviceId: req.device._id, active: true })
      .select('name dosePattern lastUpdated');
    res.json(medicines);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   GET api/deviceApi/:deviceId/wifi
// @desc    Get WiFi credentials for ESP32
// @access  Private (Device API Key)
router.get('/:deviceId/wifi', authDevice, async (req, res) => {
  try {
    const wifi = req.device.wifi;
    res.json({
      ssid: wifi.ssid,
      password: decrypt(wifi.password),
      lastUpdated: wifi.lastUpdated
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   POST api/deviceApi/:deviceId/logs
// @desc    Upload device log
// @access  Private (Device API Key)
router.post('/:deviceId/logs', authDevice, async (req, res) => {
  try {
    const { eventType, timestamp, sequenceId, scheduleId, medicineId, note } = req.body;

    const newLog = new Log({
      deviceId: req.device._id,
      scheduleId: scheduleId || null,
      medicineId: medicineId || null,
      eventType,
      timestamp,
      sequenceId,
      note
    });

    await newLog.save();
    res.json({ success: true });
  } catch (err) {
    // Catch duplicate key error (code 11000) for unique sequenceId and return 200 OK
    if (err.code === 11000) {
      return res.json({ success: true, message: 'Duplicate sequenceId ignored' });
    }
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   GET api/deviceApi/:deviceId/status
// @desc    Update device status
// @access  Private (Device API Key)
router.get('/:deviceId/status', authDevice, async (req, res) => {
  try {
    req.device.status = {
      online: true,
      lastSeenAt: new Date(),
      lastKnownIp: req.ip
    };
    await req.device.save();
    res.json({ success: true });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

module.exports = router;
