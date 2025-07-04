// server/models/Cars.js
const mongoose = require('mongoose');

const carSchema = new mongoose.Schema(
  {
    // Basic details
    make:        { type: String, default: '' },            // now optional
    model:       { type: String, default: '' },            // now optional
    badge:       { type: String, default: '' },            // optional
    rego: {
    type: String,
    required: true,
    validate: {
      validator: function (v) {
        return /^[a-zA-Z0-9]{1,6}$/.test(v);  // must be 1–6 alphanumeric
      },
      message: props => `${props.value} is not a valid rego! Must be 1–6 letters/numbers only.`,
    },
  },

    year:        Number,
    description: String,

    // Workflow / status
    location: String,
    status:   String, // e.g. “ready”, “not ready”, etc.
    stage:    { type: String, default: 'In Works' }, // In Works / Online / Sold …

    // Logistics
    next: [
      {
        location: String,
        created:  { type: Date, default: Date.now },
      },
    ],
    checklist: [String], // to-do items
    notes:     String,

    // Photos
    photos: [String],

    // History log
    history: [
      {
        location:  String,
        dateAdded: { type: Date, default: Date.now },
        dateLeft:  Date,
      },
    ],

    // Pending location updates (from Telegram plans, etc.)
    pendingLocationUpdate: {
      location:    String,
      scheduledAt: Date,
      message:     String,
    },

    // Archival
    archived:   { type: Boolean, default: false },
    archivedAt: Date,

    // Misc
    series: String,
  },
  { timestamps: true } // adds createdAt / updatedAt
);

module.exports = mongoose.model('Car', carSchema);
