const express = require('express');
const router = express.Router();
const CustomerAppointment = require('../models/CustomerAppointment');

// Get all customer appointments with populated car details
router.get('/', async (req, res) => {
  try {
    const customerAppointments = await CustomerAppointment.find().populate('car');
    res.json(customerAppointments);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Create a new customer appointment
router.post('/', async (req, res) => {
  const customerAppointment = new CustomerAppointment({
    name: req.body.name,
    dayTime: req.body.dayTime,
    car: req.body.car || null,
    comments: req.body.comments,
    dateCreated: req.body.dateCreated || Date.now(),
    source: 'manual' // Explicitly set source to 'manual' for UI-created appointments
  });

  try {
    const newCustomerAppointment = await customerAppointment.save();
    const populatedAppointment = await CustomerAppointment.findById(newCustomerAppointment._id).populate('car');
    res.status(201).json(populatedAppointment);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Update a customer appointment
router.put('/:id', async (req, res) => {
  try {
    const customerAppointment = await CustomerAppointment.findById(req.params.id);
    if (!customerAppointment) return res.status(404).json({ message: 'Customer appointment not found' });

    if (req.body.name !== undefined) customerAppointment.name = req.body.name;
    if (req.body.dayTime !== undefined) customerAppointment.dayTime = req.body.dayTime;
    if (req.body.car !== undefined) customerAppointment.car = req.body.car || null;
    if (req.body.comments !== undefined) customerAppointment.comments = req.body.comments;
    // Do not modify the source field during updates to preserve origin

    const updatedCustomerAppointment = await customerAppointment.save();
    const populatedAppointment = await CustomerAppointment.findById(updatedCustomerAppointment._id).populate('car');
    res.json(populatedAppointment);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Delete a customer appointment
router.delete('/:id', async (req, res) => {
  try {
    const customerAppointment = await CustomerAppointment.findById(req.params.id);
    if (!customerAppointment) return res.status(404).json({ message: 'Customer appointment not found' });

    await customerAppointment.deleteOne();
    res.json({ message: 'Customer appointment deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;