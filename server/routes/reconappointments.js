const express = require('express');
const router = express.Router();
const ReconAppointment = require('../models/ReconAppointment');
const { log, logRequest } = require('../logger');

router.use(logRequest);

router.get('/', async (req, res) => {
  try {
    log('Handling GET /api/reconappointments');
    const appointments = await ReconAppointment.find().populate('carItems.car');
    log(`Found ${appointments.length} recon appointments: ${JSON.stringify(appointments)}`);
    res.json(appointments);
  } catch (err) {
    log(`Error fetching recon appointments: ${err.message}`);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    log(`Handling GET /api/reconappointments/${req.params.id}`);
    const appointment = await ReconAppointment.findById(req.params.id).populate('carItems.car');
    if (!appointment) {
      log(`Recon appointment not found with ID: ${req.params.id}`);
      return res.status(404).json({ message: 'Recon appointment not found' });
    }
    log(`Found recon appointment: ${JSON.stringify(appointment)}`);
    res.json(appointment);
  } catch (err) {
    log(`Error fetching recon appointment with ID ${req.params.id}: ${err.message}`);
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/', async (req, res) => {
  try {
    log('Handling POST /api/reconappointments');
    const { reconditionerName, dayTime, carItems, category } = req.body;
    log(`Request data: reconditionerName=${reconditionerName}, dayTime=${dayTime}, carItems=${JSON.stringify(carItems)}, category=${category}`);

    // Validate required fields (only category is required)
    if (!category) {
      log('Validation failed: category is required');
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

    log('Saving new recon appointment to database');
    const savedAppointment = await appointment.save();
    log(`Saved recon appointment: ${JSON.stringify(savedAppointment)}`);

    log('Populating car field in carItems');
    const populatedAppointment = await ReconAppointment.findById(savedAppointment._id).populate('carItems.car');
    log(`Populated recon appointment: ${JSON.stringify(populatedAppointment)}`);

    res.status(201).json(populatedAppointment);
    log('Successfully created recon appointment');
  } catch (err) {
    log(`Error creating recon appointment: ${err.message}`);
    res.status(400).json({ message: 'Failed to create recon appointment', error: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    log(`Handling PUT /api/reconappointments/${req.params.id}`);
    const { reconditionerName, dayTime, carItems, category } = req.body;
    log(`Request data: reconditionerName=${reconditionerName}, dayTime=${dayTime}, carItems=${JSON.stringify(carItems)}, category=${category}`);

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

    log('Updating recon appointment in database');
    const updatedAppointment = await ReconAppointment.findByIdAndUpdate(req.params.id, updateData, { new: true }).populate('carItems.car');
    if (!updatedAppointment) {
      log(`Recon appointment not found with ID: ${req.params.id}`);
      return res.status(404).json({ message: 'Recon appointment not found' });
    }
    log(`Updated recon appointment: ${JSON.stringify(updatedAppointment)}`);

    res.json(updatedAppointment);
    log('Successfully updated recon appointment');
  } catch (err) {
    log(`Error updating recon appointment with ID ${req.params.id}: ${err.message}`);
    res.status(400).json({ message: 'Failed to update recon appointment', error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    log(`Handling DELETE /api/reconappointments/${req.params.id}`);
    const appointment = await ReconAppointment.findByIdAndDelete(req.params.id);
    if (!appointment) {
      log(`Recon appointment not found with ID: ${req.params.id}`);
      return res.status(404).json({ message: 'Recon appointment not found' });
    }
    log(`Deleted recon appointment with ID: ${req.params.id}`);
    res.json({ message: 'Recon appointment deleted' });
  } catch (err) {
    log(`Error deleting recon appointment with ID ${req.params.id}: ${err.message}`);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;