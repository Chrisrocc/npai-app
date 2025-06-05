const express = require('express');
const router = express.Router();
const ManualVerification = require('../models/ManualVerification');

// Get all manual verification entries for specific categories
router.get('/', async (req, res) => {
  try {
    const categories = ['Ready', 'Drop Off', 'Car Repairs', 'Location Update'];
    const verifications = await ManualVerification.find({ category: { $in: categories } }).sort({ created: -1 });
    res.json(verifications);
  } catch (err) {
    console.error('Error fetching manual verifications:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete a manual verification entry
router.delete('/:id', async (req, res) => {
  try {
    const verification = await ManualVerification.findByIdAndDelete(req.params.id);
    if (!verification) {
      return res.status(404).json({ message: 'Verification not found' });
    }
    res.json({ message: 'Verification deleted' });
  } catch (err) {
    console.error('Error deleting manual verification:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;