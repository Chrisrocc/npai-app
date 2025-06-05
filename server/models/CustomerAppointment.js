const mongoose = require('mongoose');

const CustomerAppointmentSchema = new mongoose.Schema({
  name: { type: String },
  dayTime: { type: String },
  car: { type: mongoose.Schema.Types.ObjectId, ref: 'Car', default: null }, // Car reference, nullable
  // Fields to store car details if car isn't found
  carDetails: {
    make: { type: String, default: '' },
    model: { type: String, default: '' },
    badge: { type: String, default: '' },
    description: { type: String, default: '' },
    rego: { type: String, default: '' }
  },
  comments: { type: String },
  dateCreated: { type: Date, default: Date.now },
  source: { type: String, enum: ['manual', 'whatsapp'], default: 'manual' }
});

module.exports = mongoose.model('CustomerAppointment', CustomerAppointmentSchema);