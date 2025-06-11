const express = require('express');
const router = express.Router();
const Car = require('../models/Cars');
const multer = require('multer');
const path = require('path');
const chalk = require('chalk');
const { updateCarHistory, processPendingLocationUpdates } = require('../utils/helpers');
const fs = require('fs');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads/';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const safeName = file.originalname.replace(/[^a-zA-Z0-9.\-_]/g, '_');
  cb(null, `car_${Date.now()}_${safeName}`);

  },
});
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const fileTypes = /jpeg|jpg|png/;
    const extname = fileTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = fileTypes.test(file.mimetype);
    if (extname && mimetype) {
      cb(null, true);
    } else {
      cb(new Error('Only image files (jpeg, jpg, png) are allowed.'));
    }
  }
});


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
  console.log(chalk.blue('Handling GET /api/cars/archived'));
  const archivedCars = await Car.find({ archived: true });
  // Removed detailed log: console.log(chalk.blue(`Found ${archivedCars.length} archived cars: ${JSON.stringify(archivedCars.map((c) => ({ _id: c._id, rego: c.rego })))`));
  res.json(archivedCars);
}));

router.get('/', asyncHandler(async (req, res) => {
  console.log(chalk.blue('Handling GET /api/cars'));
  const allCars = await Car.find({}); // Log all cars to see if new ones are visible
  // Removed detailed log: console.log(chalk.blue(`Found ${allCars.length} total cars: ${JSON.stringify(allCars.map((c) => ({ _id: c._id, rego: c.rego, archived: c.archived })))`));
  const cars = await Car.find({ archived: false });
  // Removed detailed log: console.log(chalk.blue(`Found ${cars.length} non-archived cars: ${JSON.stringify(cars.map((c) => ({ _id: c._id, rego: c.rego, archived: c.archived })))`));
  res.json(cars);
}));

router.get('/:id', asyncHandler(async (req, res) => {
  console.log(chalk.blue(`Handling GET /api/cars/:id with id=${req.params.id}`));
  const car = await Car.findById(req.params.id);
  if (!car) {
    return res.status(404).json({ message: 'Car not found' });
  }
  res.json(car);
}));

router.post('/', upload.array('photos'), asyncHandler(async (req, res) => {
  const { make, model, badge, rego, year, description, location, status, next, checklist, notes } = req.body;
  const photos = req.files ? req.files.map((file) => `uploads/${file.filename}`) : [];

  let nextDestinations = [];
  if (next) {
    if (typeof next === 'string') {
      nextDestinations = [{ location: next, created: new Date() }];
    } else if (Array.isArray(next)) {
      nextDestinations = next.map((loc) => ({
        location: loc.location || loc,
        created: loc.created ? new Date(loc.created) : new Date(),
      }));
    }
  }

  const car = new Car({
    make,
    model,
    badge,
    rego,
    year,
    description,
    location,
    status,
    next: nextDestinations,
    checklist: checklist ? checklist.split(',').map((item) => item.trim()) : [],
    notes,
    photos,
    history: location ? [{ location, dateAdded: new Date(), dateLeft: null }] : [],
  });

  await car.save();
  console.log(chalk.green(`Created new car: ${car.make} ${car.model}, Location: ${car.location}`));
  res.status(201).json(car);
}));

router.put('/:id', upload.array('photos'), asyncHandler(async (req, res) => {
  const carId = req.params.id;
  const car = await Car.findById(carId); // Ensure car is fetched before proceeding
  if (!car) {
    return res.status(404).json({ message: 'Car not found' });
  }

  const updateData = req.body;
  const newPhotos = req.files ? req.files.map((file) => `uploads/${file.filename}`) : [];

  // Merge existing photos with new photos
  if (req.body.existingPhotos) {
    const existingPhotos = JSON.parse(req.body.existingPhotos);
    updateData.photos = [...existingPhotos, ...newPhotos];
  } else if (newPhotos.length > 0) {
    updateData.photos = [...car.photos, ...newPhotos];
  }

  if (updateData.checklist) {
    if (Array.isArray(updateData.checklist)) {
      updateData.checklist = updateData.checklist.map((item) => String(item).trim()).filter((item) => item);
    } else if (typeof updateData.checklist === 'string') {
      updateData.checklist = updateData.checklist
        .split(',')
        .map((item) => item.trim())
        .filter((item) => item);
    } else {
      return res.status(400).json({ message: 'Checklist must be a string or array' });
    }
  }

  if (updateData.next) {
    if (typeof updateData.next === 'string') {
      updateData.next = [{ location: updateData.next, created: new Date() }];
    } else if (Array.isArray(updateData.next)) {
      updateData.next = updateData.next.map((loc) => ({
        location: loc.location || loc,
        created: loc.created ? new Date(loc.created) : new Date(),
      }));
    } else {
      return res.status(400).json({ message: 'Next must be a string or array' });
    }
  }

  if (updateData.location && updateData.location !== car.location) {
    const historyUpdated = await updateCarHistory(carId, updateData.location, 'Location update via PUT');
    if (!historyUpdated) {
      return res.status(500).json({ message: 'Failed to schedule history update' });
    }
    delete updateData.location;
  }

  const updatedCar = await Car.findByIdAndUpdate(carId, updateData, { new: true, runValidators: true });
  console.log(chalk.green(`Updated car: ${updatedCar.make} ${updatedCar.model}, Location: ${updatedCar.location}`));
  res.json(updatedCar);
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

  const updatedCar = await Car.findByIdAndUpdate(
    carId,
    { next: updatedNext },
    { new: true, runValidators: true }
  );

  console.log(chalk.green(`Added next location to car: ${updatedCar.make} ${updatedCar.model}, Next: ${location}`));
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
  const updatedCar = await Car.findByIdAndUpdate(
    carId,
    { next: updatedNext },
    { new: true, runValidators: true }
  );

  console.log(chalk.green(`Deleted next location from car: ${updatedCar.make} ${updatedCar.model}, Index: ${index}`));
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

  console.log(chalk.green(`Archived car: ${car.make} ${car.model}`));
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

  console.log(chalk.green(`Restored car: ${car.make} ${car.model}`));
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
    for (const photoPath of car.photos) {
      const fullPath = path.join(__dirname, '..', photoPath);
      if (fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath);
      }
    }
  }

  await Car.findByIdAndDelete(req.params.id);
  console.log(chalk.green(`Permanently deleted car: ${car.make} ${car.model}`));
  res.json({ message: 'Car permanently deleted' });
}));

module.exports = router;