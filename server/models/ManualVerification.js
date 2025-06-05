const mongoose = require('mongoose');

const manualVerificationSchema = new mongoose.Schema({
  message: { type: String, required: true },
  data: { type: [String], default: [] },
  category: { type: String, required: true },
  created: { type: Date, default: Date.now }
});

module.exports = mongoose.model('ManualVerification', manualVerificationSchema);