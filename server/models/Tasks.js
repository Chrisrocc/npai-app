const mongoose = require('mongoose');

const carItemSchema = new mongoose.Schema({
  car: { type: mongoose.Schema.Types.ObjectId, ref: 'Car', default: null }, // Nullable car reference
  carDetails: { // Store car details if car isn't found
    make: { type: String, default: '' },
    model: { type: String, default: '' },
    badge: { type: String, default: '' },
    description: { type: String, default: '' },
    rego: { type: String, default: '' }
  },
  comment: { type: String, default: '' }
});

const TaskSchema = new mongoose.Schema({
  name: { type: String },
  dayTime: { type: String },
  carItems: [carItemSchema],
  dateCreated: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Task', TaskSchema);