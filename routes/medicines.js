const express = require('express');
const router = express.Router();
const { check, validationResult } = require('express-validator');
const authUser = require('../middleware/authUser');
const Medicine = require('../models/Medicine');

// @route   GET api/medicines
// @desc    Get all active medicines for user's device
// @access  Private
router.get('/', authUser, async (req, res) => {
  try {
    const medicines = await Medicine.find({ deviceId: req.user.deviceId, active: true })
      .populate('dosePattern.scheduleId', 'slotName slotOrder');
    res.json(medicines);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   POST api/medicines
// @desc    Add new medicine
// @access  Private
router.post(
  '/',
  authUser,
  check('name', 'Name is required').not().isEmpty(),
  check('dosePattern', 'Dose pattern is required').isArray(),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const newMedicine = new Medicine({
        deviceId: req.user.deviceId,
        name: req.body.name,
        dosePattern: req.body.dosePattern
      });

      const medicine = await newMedicine.save();
      res.json(medicine);
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server Error');
    }
  }
);

// @route   PUT api/medicines/:id
// @desc    Update medicine
// @access  Private
router.put('/:id', authUser, async (req, res) => {
  try {
    let medicine = await Medicine.findById(req.params.id);

    if (!medicine) return res.status(404).json({ message: 'Medicine not found' });
    if (medicine.deviceId.toString() !== req.user.deviceId.toString()) {
      return res.status(401).json({ message: 'Not authorized' });
    }

    const updateFields = {};
    if (req.body.name) updateFields.name = req.body.name;
    if (req.body.dosePattern) updateFields.dosePattern = req.body.dosePattern;
    if (typeof req.body.active === 'boolean') updateFields.active = req.body.active;

    medicine = await Medicine.findByIdAndUpdate(
      req.params.id,
      { $set: updateFields },
      { new: true }
    );

    res.json(medicine);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   DELETE api/medicines/:id
// @desc    Soft delete medicine
// @access  Private
router.delete('/:id', authUser, async (req, res) => {
  try {
    let medicine = await Medicine.findById(req.params.id);

    if (!medicine) return res.status(404).json({ message: 'Medicine not found' });
    if (medicine.deviceId.toString() !== req.user.deviceId.toString()) {
      return res.status(401).json({ message: 'Not authorized' });
    }

    medicine.active = false;
    await medicine.save();

    res.json({ message: 'Medicine removed' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

module.exports = router;
