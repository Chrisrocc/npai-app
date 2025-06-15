// server/fix-photos.js
require('dotenv').config(); // Load .env
const mongoose = require('mongoose');
const connectDB = require('./config/db');
const Car = require('./models/Cars');

async function fixPhotos() {
  await connectDB();
  const cars = await Car.find({ photos: { $ne: [] } });
  for (const car of cars) {
    const updatedPhotos = car.photos.map(photo => {
      if (photo.startsWith('http')) return photo; // Already an S3 URL
      const filename = photo.replace('uploads/', ''); // Remove uploads/ prefix
      return `https://npai-car-photos.s3.ap-southeast-2.amazonaws.com/${filename}`;
    });
    car.photos = updatedPhotos;
    await car.save();
    console.log(`Updated photos for car ${car._id}: ${updatedPhotos}`);
  }
  console.log('Photos update complete');
  mongoose.connection.close();
}

fixPhotos().catch(console.error);