const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const jwt = require('jsonwebtoken');
const path = require('path');
const multer = require('multer');
const { parse } = require('csv-parse');
const fs = require('fs');
const { log } = require('./logger');
const Car = require('./models/Cars');
const { updateDatabaseFromPipeline } = require('./services/databaseUpdate');
const connectDB = require('./config/db');
const { processPendingLocationUpdates } = require('./utils/helpers');
const { telegramWebhook } = require('./utils/telegram');

// Import routes
const carRoutes = require('./routes/cars');
const customerAppointmentRoutes = require('./routes/customerAppointments');
const reconAppointmentRoutes = require('./routes/reconappointments');
const manualVerificationRoutes = require('./routes/manualVerifications');
const taskRoutes = require('./routes/tasks');
const noteRoutes = require('./routes/notes');

// Register models
log('info', 'Registering models...');
require('./models/Cars');
require('./models/CustomerAppointment');
require('./models/ReconAppointment');
require('./models/ManualVerification');
require('./models/Tasks');
require('./models/Note');
require('./models/Users');
log('info', 'Models registered successfully');

dotenv.config();

log('info', `JWT_SECRET: ${process.env.JWT_SECRET ? 'Set' : 'Missing'}`);
log('info', `EMAIL_PASS: ${process.env.EMAIL_PASS ? 'Set' : 'Missing'}`);

const app = express();

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
}));
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ extended: true, limit: '100mb' }));
app.use(cookieParser());
app.use((req, res, next) => {
  log('info', `Incoming request: ${req.method} ${req.originalUrl} - Body: ${JSON.stringify(req.body)}`);
  next();
});

// Serve static files for uploads
app.use('/uploads', express.static(path.join(__dirname, 'Uploads')));

// Authentication middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) {
    log('warn', `No token provided for request: ${req.method} ${req.originalUrl}`);
    return res.status(401).json({ error: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    log('info', `Middleware called for: ${req.originalUrl}, User: ${decoded.id}`);
    next();
  } catch (err) {
    log('warn', `Invalid token for request: ${req.method} ${req.originalUrl}`);
    return res.status(403).json({ error: 'Invalid token' });
  }
};

// API Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/cars', authenticateToken, carRoutes);
app.use('/api/customerappointments', authenticateToken, customerAppointmentRoutes);
app.use('/api/reconappointments', authenticateToken, reconAppointmentRoutes);
app.use('/api/manualverifications', authenticateToken, manualVerificationRoutes);
app.use('/api/tasks', authenticateToken, taskRoutes);
app.use('/api/notes', authenticateToken, noteRoutes);
app.post('/telegram-webhook', telegramWebhook);

// Reject invalid S3 URL requests
app.use((req, res, next) => {
  if (req.path.startsWith('/https://')) {
    log('warn', `Rejecting invalid S3 URL request: ${req.path}`);
    return res.status(404).send('Invalid URL - Images should be fetched directly from S3');
  }
  next();
});

// CSV Upload
const csvStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'Uploads/';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalName));
  }
});

const uploadCSV = multer({
  storage: csvStorage,
  limits: { fileSize: 15 * 1024 * 1024 },
  files: 20,
  fileFilter: (req, file, cb) => {
    const fileTypes = /csv/;
    const extname = fileTypes.test(path.extname(file.originalName).toLowerCase());
    const mimetype = fileTypes.test(file.mimetype);
    if (extname && mimetype) {
      return cb(null, true);
    } else {
      cb(new Error('Only CSV files are allowed'));
    }
  }
});

app.post('/api/cars/upload-csv', authenticateToken, uploadCSV.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });
    const newCars = [];

    const parser = parse({ delimiter: ',', columns: true, skip_empty_lines: true, quote: '"' });
    const fileStream = fs.createReadStream(req.file.path);

    fileStream
      .pipe(parser)
      .on('data', async (row) => {
        const requiredColumns = ['Make', 'Model', 'Series', 'Badge', 'CompYear', 'Colour', 'REGO'];
        if (!requiredColumns.every(col => row[col] !== undefined)) return;

        const existingCar = await Car.findOne({ rego: row.REGO });
        if (!existingCar) {
          const newCar = new Car({
            make: row.Make,
            model: row.Model,
            series: row.Series,
            badge: row.Badge,
            year: parseInt(row.CompYear, 10) || undefined,
            description: row.Colour,
            rego: row.REGO,
            stage: 'In Works',
            photos: [],
            checklist: [],
            notes: '',
            history: [],
          });
          await newCar.save();
          newCars.push({ make: row.Make, model: row.Model, rego: row.REGO });
        }
      })
      .on('end', () => {
        fs.unlinkSync(req.file.path);
        res.status(200).json({ message: 'CSV processed successfully', newCars });
      })
      .on('error', (err) => {
        fs.unlinkSync(req.file.path);
        res.status(500).json({ message: 'Error processing CSV', error: err.message });
      });
  } catch (err) {
    if (req.file) fs.unlinkSync(req.file.path);
    res.status(500).json({ message: 'Error uploading CSV', error: err.message });
  }
});

// Plans endpoints
app.get('/api/plans', authenticateToken, (req, res) => {
  try {
    const plans = JSON.parse(fs.readFileSync(path.join(__dirname, 'plans.json'), 'utf8'));
    res.status(200).json(plans);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching plans', error: err.message });
  }
});

app.put('/api/plans/:id', authenticateToken, (req, res) => {
  try {
    const plans = JSON.parse(fs.readFileSync(path.join(__dirname, 'plans.json'), 'utf8'));
    const planIndex = plans.findIndex(plan => plan.id === req.params.id);
    if (planIndex === -1) return res.status(404).json({ message: 'Plan not found' });

    plans[planIndex] = { ...plans[planIndex], ...req.body };
    fs.writeFileSync(path.join(__dirname, 'plans.json'), JSON.stringify(plans, null, 2));
    res.status(200).json({ message: 'Plan updated successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Error updating plan', error: err.message });
  }
});

// Default API ping
app.get('/', authenticateToken, (req, res) => {
  res.json({ message: 'Welcome to NPAI Car Yard API' });
});

// Static React frontend
app.use(express.static(path.join(__dirname, '../client/build')));
app.use((req, res, next) => {
  if (req.path.startsWith('/api') || req.path === '/') return next();
  res.sendFile(path.join(__dirname, '../client/build', 'index.html'), (err) => {
    if (err) {
      log('error', 'Error serving index.html: ' + err.message);
      res.status(500).send('Internal Server Error');
    }
  });
});

// Global error handler
app.use((err, req, res, next) => {
  log('error', `Unhandled error in ${req.method} ${req.path}: ` + err.message);
  res.status(500).json({ message: 'Internal Server Error', error: err.message });
});

// Cron job for pending location updates
setInterval(async () => {
  const cars = await Car.find({ pendingLocationUpdate: { $ne: null } });
  if (cars.length > 0) {
    log('info', 'Checking for pending location updates...');
    await processPendingLocationUpdates();
  }
}, 60 * 1000);

// Connect to MongoDB and start server
connectDB().then(() => {
  const PORT = process.env.PORT || 5000;
  const server = app.listen(PORT, () => {
    log('info', `Server running on port ${PORT} in ${process.env.NODE_ENV} environment`);
  });
  server.setTimeout(5 * 60 * 1000); // 5-minute timeout
}).catch((err) => {
  log('error', `Failed to start server: ${err.message}`);
});