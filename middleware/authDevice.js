const Device = require('../models/Device');

const authDevice = async (req, res, next) => {
  try {
    const deviceApiKey = req.header('x-api-key');
    const deviceId = req.params.deviceId;
    
    if (!deviceApiKey) {
      return res.status(401).json({ message: 'No API key provided' });
    }

    const device = await Device.findById(deviceId);

    if (!device || device.deviceApiKey !== deviceApiKey) {
      return res.status(401).json({ message: 'Invalid API key' });
    }

    // Mark device as online on any API hit
    device.status = {
      online: true,
      lastSeenAt: new Date(),
      lastKnownIp: req.ip
    };
    await device.save();

    req.device = device;
    next();
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
};

module.exports = authDevice;
