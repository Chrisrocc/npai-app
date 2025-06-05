const mongoose = require('mongoose');

const carItemSchema = new mongoose.Schema({
  car: { type: mongoose.Schema.Types.ObjectId, ref: 'Car', default: null },
  carDetails: {
    make: { type: String, default: '' },
    model: { type: String, default: '' },
    badge: { type: String, default: '' },
    description: { type: String, default: '' },
    rego: { type: String, default: '' }
  }
});

const NoteSchema = new mongoose.Schema({
  message: { type: String, required: true }, // The full message (e.g., "Christian: Don't get Jan to inspect the Ford Ranger XLT car")
  carItems: [carItemSchema], // Store car reference or car details
  dateCreated: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Note', NoteSchema);