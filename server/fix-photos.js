// server/fix-photos.js
require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('./config/db');
const Car = require('./models/Cars');

async function fixPhotos() {
  await connectDB();
  const cars = await Car.find({ photos: { $exists: true } }); // Find all cars with a photos field
  for (const car of cars) {
    if (car.photos && car.photos.length > 0) {
      car.photos = []; // Set photos to empty array
      await car.save();
      console.log(`Cleared photos for car ${car._id}`);
    }
  }
  console.log('Photos cleared from all cars');
  mongoose.connection.close();
}

fixPhotos().catch(console.error);