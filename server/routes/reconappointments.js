const express = require('express');
const router = express.Router();
const ReconAppointment = require('../models/ReconAppointment');
const { log, logRequest } = require('../logger');

router.use(logRequest);

router.get('/', async (req, res) => {
  try {
    const appointments = await ReconAppointment.find().populate('carItems.car');
    res.json(appointments);
  } catch (err) {
    log('error', `Error fetching recon appointments: ${err.message}`);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const appointment = await ReconAppointment.findById(req.params.id).populate('carItems.car');
    if (!appointment) {
      log('error', `Recon appointment not found with ID: ${req.params.id}`);
      return res.status(404).json({ message: 'Recon appointment not found' });
    }
    res.json(appointment);
  } catch (err) {
    log('error', `Error fetching recon appointment with ID ${req.params.id}: ${err.message}`);
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { reconditionerName, dayTime, carItems, category } = req.body;

    if (!category) {
      log('error', 'Validation failed: category is required');
      return res.status(400).json({ message: 'Category is required' });
    }

    const appointment = new ReconAppointment({
      reconditionerName: reconditionerName || '',
      dayTime: dayTime || '',
      carItems: carItems.map(item => ({
        car: item.carId || item.car || null,
        carDetails: item.carDetails || {},
        comment: item.comment || ''
      })),
      category: category || 'other'
    });

    const savedAppointment = await appointment.save();
    const populatedAppointment = await ReconAppointment.findById(savedAppointment._id).populate('carItems.car');
    res.status(201).json(populatedAppointment);
  } catch (err) {
    log('error', `Error creating recon appointment: ${err.message}`);
    res.status(400).json({ message: 'Failed to create recon appointment', error: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { reconditionerName, dayTime, carItems, category } = req.body;

    const updateData = {
      reconditionerName: reconditionerName !== undefined ? reconditionerName : '',
      dayTime: dayTime !== undefined ? dayTime : '',
      carItems: carItems.map(item => ({
        car: item.carId || item.car || null,
        carDetails: item.carDetails || {},
        comment: item.comment || ''
      })),
      category: category || 'other'
    };

    const updatedAppointment = await ReconAppointment.findByIdAndUpdate(req.params.id, updateData, { new: true }).populate('carItems.car');
    if (!updatedAppointment) {
      log('error', `Recon appointment not found with ID: ${req.params.id}`);
      return res.status(404).json({ message: 'Recon appointment not found' });
    }
    res.json(updatedAppointment);
  } catch (err) {
    log('error', `Error updating recon appointment with ID ${req.params.id}: ${err.message}`);
    res.status(400).json({ message: 'Failed to update recon appointment', error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const appointment = await ReconAppointment.findByIdAndDelete(req.params.id);
    if (!appointment) {
      log('error', `Recon appointment not found with ID: ${req.params.id}`);
      return res.status(404).json({ message: 'Recon appointment not found' });
    }
    res.json({ message: 'Recon appointment deleted' });
  } catch (err) {
    log('error', `Error deleting recon appointment with ID ${req.params.id}: ${err.message}`);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;