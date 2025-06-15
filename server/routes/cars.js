const express = require('express');
const router = express.Router();
const Car = require('../models/Cars');
const multer = require('multer');
const path = require('path');
const chalk = require('chalk');
const { updateCarHistory, processPendingLocationUpdates } = require('../utils/helpers');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const s3 = require('../s3');
const bucketName = process.env.AWS_BUCKET_NAME;

const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 15 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const fileTypes = /jpeg|jpg|png|heic/;
    const extname = fileTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = fileTypes.test(file.mimetype);
    if (extname && mimetype) {
      cb(null, true);
    } else {
      cb(new Error('Only image files (jpeg, jpg, png, heic) are allowed.'));
    }
  },
});

const uploadToS3 = async (fileBuffer, fileName, mimetype) => {
  const key = `car_${Date.now()}_${uuidv4()}_${fileName.replace(/[^a-zA-Z0-9.\-_]/g, '_')}`;
  const params = {
    Bucket: bucketName,
    Key: key,
    Body: fileBuffer,
    ContentType: mimetype,
    ACL: 'private',
    CacheControl: 'public, max-age=31536000',
  };
  await s3.upload(params).promise();
  return `https://${bucketName}.s3.${process.env.AWS_REGION || 'ap-southeast-2'}.amazonaws.com/${key}`;
};

const deleteFromS3 = async (url) => {
  const key = url.split(`${bucketName}.s3.${process.env.AWS_REGION || 'ap-southeast-2'}.amazonaws.com/`)[1];
  if (!key) return;
  await s3.deleteObject({ Bucket: bucketName, Key: key }).promise();
};

const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch((err) => {
    console.error(chalk.red(`Route error: ${req.method} ${req.path}`, err.message, err.stack));
    res.status(500).json({ message: 'Server error', error: err.message, details: process.env.NODE_ENV === 'development' ? err.stack : undefined });
  });

router.use(asyncHandler(async (req, res, next) => {
  console.log(chalk.blue(`Processing middleware for ${req.method} ${req.path}, User: ${req.user ? req.user.id : 'Not authenticated'}`));
  await processPendingLocationUpdates();
  next();
}));

router.get('/archived', asyncHandler(async (req, res) => {
  const archivedCars = await Car.find({ archived: true });
  res.json(archivedCars);
}));

router.post('/:id/next', asyncHandler(async (req, res) => {
  const carId = req.params.id;
  const { location } = req.body;

  if (!location) {
    return res.status(400).json({ message: 'Location is required' });
  }

  const car = await Car.findById(carId);
  if (!car) {
    return res.status(404).json({ message: 'Car not found' });
  }

  const newNextEntry = { location, created: new Date() };
  const updatedNext = [...car.next, newNextEntry];

  const updatedCar = await Car.findByIdAndUpdate(carId, { next: updatedNext }, { new: true, runValidators: true });
  res.json(updatedCar);
}));

router.delete('/:id/next/:index', asyncHandler(async (req, res) => {
  const carId = req.params.id;
  const index = parseInt(req.params.index, 10);

  const car = await Car.findById(carId);
  if (!car) {
    return res.status(404).json({ message: 'Car not found' });
  }

  if (index < 0 || index >= car.next.length) {
    return res.status(400).json({ message: 'Invalid next entry index' });
  }

  const updatedNext = car.next.filter((_, i) => i !== index);
  const updatedCar = await Car.findByIdAndUpdate(carId, { next: updatedNext }, { new: true, runValidators: true });
  res.json(updatedCar);
}));

router.post('/:id/set-location', asyncHandler(async (req, res) => {
  const carId = req.params.id;
  const { location, message, next } = req.body;

  if (!location) {
    return res.status(400).json({ message: 'Location is required' });
  }

  const car = await Car.findById(carId);
  if (!car) {
    return res.status(404).json({ message: 'Car not found' });
  }

  let updatedNext = car.next;
  if (next) {
    updatedNext = next.map((loc) => ({
      location: loc.location || loc,
      created: loc.created ? new Date(loc.created) : new Date(),
    }));
    await Car.findByIdAndUpdate(carId, { next: updatedNext }, { new: true });
  }

  await updateCarHistory(carId, location, message || 'Set as current location from next list');
  const updatedCar = await Car.findById(carId);
  res.status(200).json(updatedCar);
}));

router.delete('/:id', asyncHandler(async (req, res) => {
  const car = await Car.findById(req.params.id);
  if (!car) {
    return res.status(404).json({ message: 'Car not found' });
  }

  car.archived = true;
  car.archivedAt = new Date();
  await car.save();

  res.json({ message: 'Car archived successfully' });
}));

router.post('/:id/restore', asyncHandler(async (req, res) => {
  const car = await Car.findById(req.params.id);
  if (!car) {
    return res.status(404).json({ message: 'Car not found' });
  }
  if (!car.archived) {
    return res.status(400).json({ message: 'Car is not archived' });
  }

  car.archived = false;
  car.archivedAt = null;
  await car.save();

  res.json({ message: 'Car restored successfully', car });
}));

router.delete('/:id/permanent', asyncHandler(async (req, res) => {
  const car = await Car.findById(req.params.id);
  if (!car) {
    return res.status(404).json({ message: 'Car not found' });
  }
  if (!car.archived) {
    return res.status(400).json({ message: 'Car is not archived' });
  }

  if (car.photos && car.photos.length > 0) {
    await Promise.all(car.photos.map(deleteFromS3));
  }

  await Car.findByIdAndDelete(req.params.id);
  res.json({ message: 'Car permanently deleted' });
}));

module.exports = router;
