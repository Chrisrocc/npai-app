const mongoose = require('mongoose');

const carItemSchema = new mongoose.Schema({
  car: { type: mongoose.Schema.Types.ObjectId, ref: 'Car', default: null },
  carDetails: {
    make: { type: String, default: '' },
    model: { type: String, default: '' },
    badge: { type: String, default: '' },
    description: { type: String, default: '' },
    rego: { type: String, default: '' }
  },
  comment: { type: String, default: '' }
}, { _id: true });

const reconAppointmentSchema = new mongoose.Schema({
  reconditionerName: { type: String, required: true },
  dayTime: { type: String, default: '' },
  carItems: [carItemSchema],
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
  },
  dateCreated: { type: Date, default: Date.now }
});

module.exports = mongoose.model('ReconAppointment', reconAppointmentSchema);