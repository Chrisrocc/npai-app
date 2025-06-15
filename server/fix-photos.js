// server/fix-photos.js
require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('./config/db');
const Car = require('./models/Cars');

async function fixPhotos() {
  await connectDB();
  const cars = await Car.find({ photos: { $ne: [] } });
  for (const car of cars) {
    const updatedPhotos = car.photos.map(photo => {
      if (photo.startsWith('https://npai-car-photos.s3.ap-southeast-2.amazonaws.com')) return photo;
      const filename = photo
        .replace(/^uploads\//, '')
        .replace(/^https:\/\/npai-backend\.onrender\.com\/uploads\//, '')
        .replace(/^https:\/\/npai-backend\.onrender\.com\/uploads\//, '');
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