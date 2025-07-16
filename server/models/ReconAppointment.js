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

const ReconAppointmentSchema = new mongoose.Schema({
  reconditionerName: { type: String}, // Renamed from 'name'
  dayTime: { type: String },
  carItems: [carItemSchema],
  dateCreated: { type: Date, default: Date.now },
  category: {
    type: String,
    required: true,
    enum: [
      'dents',
      'auto electrical',
      'interior minor',
      'battery',
      'A/C',
      'Windscreen',
      'Tint',
      'Touch Up',
      'wheels',
      'other',
      'Mechanic',
      'Body',
      'Interior Major'
    ],
    default: 'other'
  }
});

module.exports = mongoose.model('ReconAppointment', ReconAppointmentSchema);