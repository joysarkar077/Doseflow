require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');
const Device = require('./models/Device');
const Schedule = require('./models/Schedule');
const Medicine = require('./models/Medicine');
const Log = require('./models/Log');

mongoose.connect(process.env.MONGODB_URI);

const seedDB = async () => {
  try {
    console.log('Clearing old data...');
    await User.deleteMany({});
    await Device.deleteMany({});
    await Schedule.deleteMany({});
    await Medicine.deleteMany({});
    await Log.deleteMany({});

    console.log('Creating device...');
    const device = await Device.create({
      deviceName: process.env.SEED_DEVICE_NAME || 'SMAB Device',
      deviceApiKey: process.env.SEED_DEVICE_API_KEY || 'smab-api-key-dev',
      snoozeTimerMinutes: 10,
      status: { online: false }
    });

    console.log('Creating default schedules...');
    await Schedule.insertMany([
      { deviceId: device._id, slotName: 'Morning', slotOrder: 0, timeStart: '08:00', isDefault: true, active: true },
      { deviceId: device._id, slotName: 'Noon', slotOrder: 1, timeStart: '14:00', isDefault: true, active: true },
      { deviceId: device._id, slotName: 'Night', slotOrder: 2, timeStart: '20:00', isDefault: true, active: true }
    ]);

    console.log('Creating user...');
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(process.env.SEED_PASSWORD || 'admin', salt);

    await User.create({
      username: process.env.SEED_USERNAME || 'admin',
      passwordHash: passwordHash,
      role: 'admin',
      deviceId: device._id
    });

    console.log('Seed completed successfully.');
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

seedDB();
