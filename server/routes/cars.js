const express = require('express');
const router = express.Router();
const Car = require('../models/Cars');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const AWS = require('aws-sdk');
const { log } = require('../logger'); // Import logger.js
const { updateCarHistory, processPendingLocationUpdates } = require('../utils/helpers');

AWS.config.update({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: 'ap-southeast-2',
});

const s3 = new AWS.S3();
const bucketName = process.env.AWS_BUCKET_NAME || 'npai-car-photos';

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'Uploads/';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 15 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const fileTypes = /jpeg|jpg|png|heic/;
    const extname = fileTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = fileTypes.test(file.mimetype);
    if (extname && mimetype) cb(null, true);
    else cb(new Error('Only image files (jpeg, jpg, png, heic) are allowed.'));
  },
});

const uploadToS3 = async (filePath, fileName, mimetype) => {
  const key = `car_${Date.now()}_${uuidv4()}_${fileName.replace(/[^a-zA-Z0-9.\-_]/g, '_')}`;
  const fileStream = fs.createReadStream(filePath);
  const params = {
    Bucket: bucketName,
    Key: key,
    Body: fileStream,
    ContentType: mimetype,
    CacheControl: 'public, max-age=31536000',
  };
  try {
    log('info', `Uploading to S3: ${key}`); // Will be filtered out
    const result = await s3.upload(params, {
      partSize: 5 * 1024 * 1024,
      queueSize: 4,
    }).promise();
    log('info', `S3 upload successful: ${key}`); // Will be filtered out
    return `https://${bucketName}.s3.ap-southeast-2.amazonaws.com/${key}`;
  } catch (error) {
    log('error', `S3 upload error for ${key}: ${error.message}`);
    throw new Error(`Failed to upload to S3: ${error.message}`);
  } finally {
    fs.unlink(filePath, (err) => {
      if (err) log('error', `Error deleting temp file ${filePath}: ${err.message}`);
    });
  }
};

const deleteFromS3 = async (url) => {
  try {
    const key = url.split(`${bucketName}.s3.ap-southeast-2.amazonaws.com/`)[1];
    if (!key) return;
    await s3.deleteObject({ Bucket: bucketName, Key: key }).promise();
    log('info', `Deleted from S3: ${key}`); // Will be filtered out
  } catch (error) {
    log('error', `S3 delete error for ${url}: ${error.message}`);
  }
};

const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch((err) => {
    log('error', `Route error: ${req.method} ${req.path} ${err.message}`);
    res.status(500).json({
      message: 'Server error',
      error: err.message,
      details: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    });
  });

router.use(asyncHandler(async (req, res, next) => {
  log('info', `Processing middleware for ${req.method} ${req.path}, User: ${req.user ? req.user.id : 'Not authenticated'}`);
  await processPendingLocationUpdates();
  next();
}));

router.get('/archived', asyncHandler(async (req, res) => {
  const archivedCars = await Car.find({ archived: true });
  res.json(archivedCars);
}));

router.get('/', asyncHandler(async (req, res) => {
  const cars = await Car.find({ archived: false });
  res.json(cars);
}));

router.get('/test-s3', asyncHandler(async (req, res) => {
  const params = {
    Bucket: bucketName,
    Key: `test/test-file-${Date.now()}.txt`,
    Body: Buffer.from('Test file'),
    ContentType: 'text/plain',
  };
  await s3.upload(params, {
    partSize: 5 * 1024 * 1024,
    queueSize: 4,
  }).promise();
  res.json({ message: 'S3 upload successful' });
}));

router.get('/:id', asyncHandler(async (req, res) => {
  const car = await Car.findById(req.params.id);
  if (!car) return res.status(404).json({ message: 'Car not found' });
  res.json(car);
}));

router.post('/', upload.array('photos', 30), asyncHandler(async (req, res) => {
  const { make, model, badge, rego, year, description, location, status, next, checklist, notes } = req.body;
  if (!make || !model || !rego) {
    return res.status(400).json({ message: 'Make, model, and rego are required' });
  }
  const sanitizedRego = rego.replace(/[^a-zA-Z0-9]/g, '');
  if (sanitizedRego.length < 1 || sanitizedRego.length > 6) {
    return res.status(400).json({ message: 'Rego must be 1-6 alphanumeric characters' });
  }

  let photoUrls = [];
  if (req.files && req.files.length > 0) {
    const uploadPromises = req.files.map(file => uploadToS3(file.path, file.originalname, file.mimetype));
    photoUrls = await Promise.all(uploadPromises);
  }

  let nextDestinations = [];
  if (next) {
    if (typeof next === 'string') {
      nextDestinations = [{ location: next, created: new Date() }];
    } else if (Array.isArray(next)) {
      nextDestinations = next.map(loc => ({
        location: loc.location || loc,
        created: loc.created ? new Date(loc.created) : new Date(),
      }));
    }
  }

  const car = new Car({
    make,
    model,
    badge,
    rego: sanitizedRego,
    year,
    description,
    location,
    status,
    next: nextDestinations,
    checklist: checklist ? checklist.split(',').map(item => item.trim()) : [],
    notes,
    photos: photoUrls,
    history: location ? [{ location, dateAdded: new Date(), dateLeft: null }] : [],
  });

  try {
    await car.save();
    log('info', `Created new car: ${car.make} ${car.model}, Location: ${car.location}`); // Will be filtered out
    res.status(201).json(car);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: 'Car with this rego already exists' });
    }
    throw error;
  }
}));

router.put('/:id', upload.array('photos', 30), asyncHandler(async (req, res) => {
  const carId = req.params.id;
  log('info', `PUT /api/cars/:id body: ${JSON.stringify(req.body)}, files: ${req.files ? req.files.length : 0}`); // Will be filtered out
  const car = await Car.findById(carId);
  if (!car) return res.status(404).json({ message: 'Car not found' });

  const updateData = { ...req.body };
  let newPhotoUrls = [];

  if (req.files && req.files.length > 0) {
    const uploadPromises = req.files.map(file => uploadToS3(file.path, file.originalname, file.mimetype));
    newPhotoUrls = await Promise.all(uploadPromises);
  }

  if (req.body.existingPhotos) {
    const existingPhotos = JSON.parse(req.body.existingPhotos);
    const removedPhotos = car.photos.filter(url => !existingPhotos.includes(url));
    await Promise.all(removedPhotos.map(deleteFromS3));
    updateData.photos = [...existingPhotos, ...newPhotoUrls];
  } else if (newPhotoUrls.length > 0) {
    updateData.photos = [...car.photos, ...newPhotoUrls];
  }

  if (updateData.checklist) {
    updateData.checklist = typeof updateData.checklist === 'string'
      ? updateData.checklist.split(',').map(item => item.trim()).filter(Boolean)
      : updateData.checklist.map(item => String(item).trim()).filter(Boolean);
  }

  if (updateData.next) {
    updateData.next = typeof updateData.next === 'string'
      ? [{ location: updateData.next, created: new Date() }]
      : updateData.next.map(loc => ({
          location: loc.location || loc,
          created: loc.created ? new Date(loc.created) : new Date(),
        }));
  }

  if (updateData.rego) {
    const sanitizedRego = updateData.rego.replace(/[^a-zA-Z0-9]/g, '');
    if (sanitizedRego.length < 1 || sanitizedRego.length > 6) {
      return res.status(400).json({ message: 'Rego must be 1-6 alphanumeric characters' });
    }
    updateData.rego = sanitizedRego;
  }

  if (updateData.location && updateData.location !== car.location) {
    const historyUpdated = await updateCarHistory(carId, updateData.location, 'Location update via PUT');
    if (!historyUpdated) return res.status(500).json({ message: 'Failed to schedule history update' });
  }

  const finalUpdateData = {};
  [
    'make', 'model', 'badge', 'rego', 'year',
    'description', 'location', 'status', 'next',
    'checklist', 'notes', 'photos', 'stage'
  ].forEach(field => {
    if (Object.prototype.hasOwnProperty.call(updateData, field)) {
      finalUpdateData[field] = updateData[field];
    }
  });

  const updatedCar = await Car.findByIdAndUpdate(
    carId,
    { $set: finalUpdateData },
    { new: true, runValidators: true }
  );
  log('info', `Updated car: ${updatedCar.make} ${updatedCar.model}, Location: ${updatedCar.location}`); // Will be filtered out
  res.json(updatedCar);
}));

router.post('/:id/next', asyncHandler(async (req, res) => {
  const { location } = req.body;
  if (!location) return res.status(400).json({ message: 'Location is required' });
  const car = await Car.findById(req.params.id);
  if (!car) return res.status(404).json({ message: 'Car not found' });
  car.next.push({ location, created: new Date() });
  await car.save();
  res.json(car);
}));

router.delete('/:id/next/:index', asyncHandler(async (req, res) => {
  const index = parseInt(req.params.index, 10);
  const car = await Car.findById(req.params.id);
  if (!car || index < 0 || index >= car.next.length) return res.status(404).json({ message: 'Invalid car or index' });
  car.next.splice(index, 1);
  await car.save();
  res.json(car);
}));

router.post('/:id/set-location', asyncHandler(async (req, res) => {
  const { location, message, next } = req.body;
  const car = await Car.findById(req.params.id);
  if (!car) return res.status(404).json({ message: 'Car not found' });
  if (next) car.next = next.map(loc => ({
    location: loc.location || loc,
    created: loc.created ? new Date(loc.created) : new Date(),
  }));
  await updateCarHistory(req.params.id, location, message || 'Set as current location from next list');
  const updatedCar = await Car.findById(req.params.id);
  res.status(200).json(updatedCar);
}));

router.delete('/:id', asyncHandler(async (req, res) => {
  const car = await Car.findById(req.params.id);
  if (!car) return res.status(404).json({ message: 'Car not found' });
  car.archived = true;
  car.archivedAt = new Date();
  await car.save();
  res.json({ message: 'Car archived successfully' });
}));

router.post('/:id/restore', asyncHandler(async (req, res) => {
  const car = await Car.findById(req.params.id);
  if (!car || !car.archived) return res.status(400).json({ message: 'Car not archived or not found' });
  car.archived = false;
  car.archivedAt = null;
  await car.save();
  res.json({ message: 'Car restored successfully', car });
}));

router.delete('/:id/permanent', asyncHandler(async (req, res) => {
  const car = await Car.findById(req.params.id);
  if (!car || !car.archived) return res.status(400).json({ message: 'Car not archived or not found' });
  if (car.photos && car.photos.length > 0) {
    await Promise.all(car.photos.map(deleteFromS3));
  }
  await Car.findByIdAndDelete(req.params.id);
  res.json({ message: 'Car permanently deleted' });
}));

module.exports = router;