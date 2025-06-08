const mongoose = require("mongoose");

const CarSchema = new mongoose.Schema({
  make: { type: String, required: true },
  model: { type: String, required: true },
  badge: { type: String },
  rego: { type: String, unique: true, required: true },
  year: { type: Number },
  description: { type: String }, // Includes color and features (e.g., "Grey with bullbar")
  location: { type: String },
  status: { type: String },
  next: [
    {
      _id: { type: mongoose.Schema.Types.ObjectId },
      location: { type: String },
      created: { type: Date, default: Date.now },
    },
  ],
  stage: { type: String, default: "In Works" },
  photos: { type: [String], default: [] },
  checklist: { type: [String] },
  notes: { type: String, default: "" },
  history: [
    {
      _id: { type: mongoose.Schema.Types.ObjectId },
      location: { type: String },
      dateAdded: { type: Date, default: Date.now },
      dateLeft: { type: Date, default: null },
      message: { type: String },
    },
  ],
  pendingLocationUpdate: {
    type: {
      location: { type: String },
      scheduledAt: { type: Date },
      message: { type: String },
    },
    default: null,
  },
  archived: { type: Boolean, default: false },
  archivedAt: { type: Date },
}, { strict: false });

module.exports = mongoose.model("Car", CarSchema);