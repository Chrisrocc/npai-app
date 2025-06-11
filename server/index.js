const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const cookieParser = require('cookie-parser');
const path = require('path');
const chalk = require('chalk');
const { logRequest } = require('./logger');
const connectDB = require('./config/db');
const authenticateToken = require('./middleware/auth');
const multer = require('multer');
const { parse } = require('csv-parse');
const fs = require('fs');
const { processPendingLocationUpdates } = require('./utils/helpers');
const { startCronJobs } = require('./utils/cron-jobs');

// Import routes
const carRoutes = require('./routes/cars');
const customerAppointmentRoutes = require('./routes/customerAppointments');
const reconAppointmentRoutes = require('./routes/reconappointments');
const manualVerificationRoutes = require('./routes/manualVerifications');
const taskRoutes = require('./routes/tasks');
const noteRoutes = require('./routes/notes');

// Register models
console.log(chalk.blue('Registering models...'));
require('./models/Cars');
require('./models/CustomerAppointment');
require('./models/ReconAppointment');
require('./models/ManualVerification');
require('./models/Tasks');
require('./models/Note');
console.log(chalk.green('Models registered successfully'));

// Register User model
console.log(chalk.blue('Registering User model...'));
require('./models/Users');
console.log(chalk.green('User model registered successfully'));

dotenv.config();

console.log('JWT_SECRET:', process.env.JWT_SECRET ? chalk.green('Set') : chalk.red('Missing'));
console.log('EMAIL_PASS:', process.env.EMAIL_PASS ? chalk.green('Set') : chalk.red('Missing'));

const app = express();

// Configure Multer for CSV file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads/';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 15 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const fileTypes = /csv/;
    const extname = fileTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = fileTypes.test(file.mimetype);
    if (extname && mimetype) {
      return cb(null, true);
    } else {
      cb(new Error('Only CSV files are allowed'));
    }
  }
});

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
}));
app.use(cookieParser());
app.use(logRequest); // ✅ Fixed

// Serve static uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Connect to MongoDB
connectDB();

// API Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/cars', authenticateToken, carRoutes);
app.use('/api/customerappointments', authenticateToken, customerAppointmentRoutes);
app.use('/api/reconappointments', authenticateToken, reconAppointmentRoutes);
app.use('/api/manualverifications', authenticateToken, manualVerificationRoutes);
app.use('/api/tasks', authenticateToken, taskRoutes);
app.use('/api/notes', authenticateToken, noteRoutes);

// Telegram webhook
app.post('/telegram-webhook', require('./utils/telegram').telegramWebhook);

// CSV upload route
app.post('/api/cars/upload-csv', authenticateToken, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });
    const mongoose = require('mongoose');
    const Car = mongoose.model('Car');
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

// API routes for plans
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

// Default route
app.get('/', (req, res) => {
  res.send('Welcome to NPAI Car Yard API');
});

// Static React frontend
app.use(express.static(path.join(__dirname, '../client/build')));
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/build', 'index.html'));
});

// Global error handler
app.use((err, req, res, next) => {
  console.error(chalk.red(`Unhandled error in ${req.method} ${req.path}:`, err.message));
  res.status(500).json({ message: 'Internal Server Error' });
});

// Cron job every minute
setInterval(async () => {
  console.log(chalk.blue('Checking for pending location updates...'));
  await processPendingLocationUpdates();
}, 60 * 1000);

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(chalk.green(`Server running on port ${PORT}`));
  startCronJobs();
  console.log(chalk.green('Cron jobs started'));
});
