const express = require('express');
const router = express.Router();
const Note = require('../models/Note');

// Get all notes with populated car details
router.get('/', async (req, res) => {
  try {
    const notes = await Note.find().populate('carItems.car');
    res.json(notes);
  } catch (err) {
    console.error('Error fetching notes:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create a new note
router.post('/', async (req, res) => {
  try {
    const note = new Note({
      message: req.body.message,
      carItems: (req.body.carItems || []).map(item => ({
        car: item.car || null,
        carDetails: item.carDetails || {},
      })),
      dateCreated: req.body.dateCreated || Date.now()
    });

    const newNote = await note.save();
    const populatedNote = await Note.findById(newNote._id).populate('carItems.car');
    res.status(201).json(populatedNote);
  } catch (err) {
    console.error('Error creating note:', err);
    res.status(400).json({ message: 'Failed to create note', error: err.message });
  }
});

// Update a note
router.put('/:id', async (req, res) => {
  try {
    const note = await Note.findById(req.params.id);
    if (!note) return res.status(404).json({ message: 'Note not found' });

    if (req.body.message !== undefined) note.message = req.body.message;
    if (req.body.carItems !== undefined) {
      note.carItems = req.body.carItems.map(item => ({
        car: item.car || null,
        carDetails: item.carDetails || {},
      }));
    }

    const updatedNote = await note.save();
    const populatedNote = await Note.findById(updatedNote._id).populate('carItems.car');
    res.json(populatedNote);
  } catch (err) {
    console.error('Error updating note:', err);
    res.status(400).json({ message: 'Failed to update note', error: err.message });
  }
});

// Delete a note
router.delete('/:id', async (req, res) => {
  try {
    const note = await Note.findById(req.params.id);
    if (!note) return res.status(404).json({ message: 'Note not found' });

    await note.deleteOne();
    res.json({ message: 'Note deleted' });
  } catch (err) {
    console.error('Error deleting note:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;