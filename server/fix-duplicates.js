require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('./config/db');
const Car = require('./models/Cars');

async function fixDuplicates() {
  await connectDB();
  const cars = await Car.find({ rego: { $exists: true } }).sort({ _id: 1 }); // Sort by _id to keep the oldest
  const seenRegos = new Map();

  for (const car of cars) {
    if (seenRegos.has(car.rego)) {
      console.log(`Deleting duplicate car ${car._id} with rego ${car.rego}`);
      await Car.findByIdAndDelete(car._id);
    } else {
      seenRegos.set(car.rego, true);
    }
  }
  console.log('Duplicate regos removed');
  mongoose.connection.close();
}

fixDuplicates().catch(console.error);