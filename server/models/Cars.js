const mongoose = require('mongoose');

const carSchema = new mongoose.Schema(
  {
    make: { type: String, default: '' },
    model: { type: String, default: '' },
    badge: { type: String, default: '' },
    rego: {
      type: String,
      required: true,
      set: v => v ? v.toUpperCase().replace(/[^A-Z0-9]/g, '') : v, // Normalize to uppercase, alphanumeric only
      validate: {
        validator: function(v) {
          return /^[A-Z0-9]{1,6}$/.test(v); // 1-6 uppercase alphanumeric
        },
        message: props => `${props.value} is not a valid rego! Must be 1-6 letters/numbers only, uppercase.`,
      },
    },
    year: Number,
    description: String,
    location: String,
    status: String,
    stage: { type: String, default: 'In Works' },
    next: [{
      location: String,
      created: { type: Date, default: Date.now },
    }],
    checklist: [String],
    notes: String,
    photos: [String],
    history: [{
      location: String,
      dateAdded: { type: Date, default: Date.now },
      dateLeft: Date,
    }],
    pendingLocationUpdate: {
      location: String,
      scheduledAt: Date,
      message: String,
    },
    archived: { type: Boolean, default: false },
    archivedAt: Date,
    series: String,
  },
  { timestamps: true }
);

// Optional: Add unique index on rego (if not already set)
carSchema.index({ rego: 1 }, { unique: true });

module.exports = mongoose.model('Car', carSchema);