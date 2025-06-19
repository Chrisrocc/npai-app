const mongoose = require('mongoose');

const carSchema = new mongoose.Schema({
  make: { type: String, required: true },
  model: { type: String, required: true },
  badge: String,
  rego: {
    type: String,
    required: true,
    validate: {
      validator: function(v) {
        return /^[a-zA-Z0-9]{1,6}$/.test(v); // Restrict to 1-6 alphanumeric characters
      },
      message: props => `${props.value} is not a valid rego! Must be 1-6 letters/numbers only.`
    }
  },
  year: Number,
  description: String,
  location: String,
  status: String, // Readiness status (e.g., empty, ready)
  next: [{
    location: String,
    created: { type: Date, default: Date.now }
  }],
  checklist: [String],
  notes: String,
  photos: [String],
  history: [{
    location: String,
    dateAdded: { type: Date, default: Date.now },
    dateLeft: Date
  }],
  pendingLocationUpdate: {
    location: String,
    scheduledAt: Date,
    message: String
  },
  archived: { type: Boolean, default: false },
  archivedAt: Date,
  series: String,
  stage: { type: String, default: 'In Works' }, // Default stage to "In Works"
  __v: Number
});

module.exports = mongoose.model('Car', carSchema);