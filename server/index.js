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
const { exec } = require('child_process');

dotenv.config();

const app = express();

// Multer Configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads/';
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 },
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
  origin: process.env.FRONTEND_URL || 'http://localhost:3000', // Dynamic origin for production
  credentials: true,
}));
app.use(cookieParser());
app.use(logRequest);

// Serve static files from the Uploads folder
app.use('/uploads', express.static(path.join(__dirname, 'Uploads')));

// Connect to MongoDB
connectDB();

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/cars', authenticateToken, require('./routes/cars'));
app.use('/api/customerappointments', authenticateToken, require('./routes/customerAppointments'));
app.use('/api/reconappointments', authenticateToken, require('./routes/reconappointments'));
app.use('/api/manualverifications', authenticateToken, require('./routes/manualVerifications'));
app.use('/api/tasks', authenticateToken, require('./routes/tasks'));
app.use('/api/notes', authenticateToken, require('./routes/notes'));

// Register models
console.log(chalk.blue('Registering models...'));
require('./models/Cars');
require('./models/CustomerAppointment');
require('./models/ReconAppointment');
require('./models/ManualVerification');
require('./models/Tasks');
require('./models/Note');
require('./models/Users');
console.log(chalk.green('Models registered successfully'));

// Register User model
console.log(chalk.blue('Registering User model...'));
require('./models/Users');
console.log(chalk.green('User model registered successfully'));

console.log('JWT_SECRET:', process.env.JWT_SECRET ? chalk.green('Set') : chalk.red('Missing'));
console.log('EMAIL_PASS:', process.env.EMAIL_PASS ? chalk.green('Set') : chalk.red('Missing'));

// Python Script Runner
async function runPythonScript(message) {
  return new Promise((resolve) => {
    exec(`python3 npai.py "${message}"`, (error, stdout, stderr) => {
      if (error) {
        console.error(chalk.red(`Python execution error: ${error.message}`));
        resolve({ error: error.message });
      } else {
        try {
          const result = JSON.parse(stdout);
          resolve(result);
        } catch (e) {
          console.error(chalk.red(`Python output parse error: ${e.message}`));
          resolve({ error: e.message });
        }
      }
    });
  });
}

// Telegram Webhook
app.post('/telegram-webhook', async (req, res) => {
  const { message } = req.body;
  if (!message || !message.text) {
    return res.sendStatus(200);
  }

  const pythonResult = await runPythonScript(message.text);
  if (pythonResult.error) {
    console.error(chalk.red('Python script error:', pythonResult.error));
    return res.sendStatus(500);
  }

  const Car = require('./models/Cars');
  const { categories } = pythonResult;

  for (const category in categories) {
    if (category === "Ready") {
      for (const entry of categories[category]) {
        const { data, fromPhoto } = entry;
        const [make, model, badge, description, rego, location, status, notes] = data;
        const query = {
          ...(make && make !== "Car" ? { make: { $regex: new RegExp(`^${make}$`, 'i') } } : {}),
          ...(model ? { model: { $regex: new RegExp(`^${model}$`, 'i') } } : {}),
          ...(rego ? { rego: { $regex: new RegExp(`^${rego}$`, 'i') } } : {}),
          ...(description ? { description: { $regex: new RegExp(description, 'i') } } : {})
        };
        try {
          let car = await Car.findOne(query);
          if (car) {
            car.status = status === "Ready" || status === "ready" ? "Ready" : car.status;
            car.location = location || car.location;
            car.notes = notes || car.notes;
            await car.save();
            console.log(chalk.green(`Updated ${car.rego} to status: ${car.status}, location: ${car.location}, notes: ${car.notes}`));
          } else if (make === "Car" && !rego) {
            console.log(chalk.yellow("No specific car identified, skipping update."));
          } else {
            console.log(chalk.yellow(`No matching car found for query: ${JSON.stringify(query)}`));
          }
        } catch (error) {
          console.error(chalk.red(`Error updating car: ${error.message}`));
        }
      }
    } else if (category === "Drop Off") {
      for (const entry of categories[category]) {
        const { data } = entry;
        const [make, model, badge, description, rego, currentLocation, nextLocation, notes] = data;
        const query = {
          ...(make && make !== "Car" ? { make: { $regex: new RegExp(`^${make}$`, 'i') } } : {}),
          ...(model ? { model: { $regex: new RegExp(`^${model}$`, 'i') } } : {}),
          ...(rego ? { rego: { $regex: new RegExp(`^${rego}$`, 'i') } } : {}),
          ...(description ? { description: { $regex: new RegExp(description, 'i') } } : {})
        };
        try {
          let car = await Car.findOne(query);
          if (car) {
            car.location = currentLocation || car.location;
            if (nextLocation && nextLocation !== "picked up") {
              car.next = [{ location: nextLocation, created: new Date() }, ...car.next];
            }
            car.notes = notes || car.notes;
            await car.save();
            console.log(chalk.green(`Updated ${car.rego} location to ${car.location}, next: ${nextLocation}, notes: ${car.notes}`));
          } else if (make === "Car" && !rego) {
            console.log(chalk.yellow("No specific car identified for drop-off, skipping update."));
          } else {
            console.log(chalk.yellow(`No matching car found for drop-off query: ${JSON.stringify(query)}`));
          }
        } catch (error) {
          console.error(chalk.red(`Error updating car for drop-off: ${error.message}`));
        }
      }
    } else if (category === "Customer Appointment") {
      // Handle customer appointments (to be implemented based on your needs)
      console.log(chalk.blue("Customer Appointment data received:", categories[category]));
    } else if (category === "Reconditioning Appointment") {
      // Handle reconditioning appointments (to be implemented)
      console.log(chalk.blue("Reconditioning Appointment data received:", categories[category]));
    } else if (category === "Car Repairs") {
      // Handle car repairs (to be implemented)
      console.log(chalk.blue("Car Repairs data received:", categories[category]));
    } else if (category === "Location Update") {
      for (const entry of categories[category]) {
        const { data } = entry;
        const [make, model, badge, description, rego, oldLocation, newLocation, notes] = data;
        const query = {
          ...(make && make !== "Car" ? { make: { $regex: new RegExp(`^${make}$`, 'i') } } : {}),
          ...(model ? { model: { $regex: new RegExp(`^${model}$`, 'i') } } : {}),
          ...(rego ? { rego: { $regex: new RegExp(`^${rego}$`, 'i') } } : {}),
          ...(description ? { description: { $regex: new RegExp(description, 'i') } } : {})
        };
        try {
          let car = await Car.findOne(query);
          if (car) {
            if (oldLocation && car.location !== oldLocation) {
              console.log(chalk.yellow(`Location mismatch: expected ${oldLocation}, found ${car.location}, proceeding with update`));
            }
            car.location = newLocation || car.location;
            car.notes = notes || car.notes;
            await car.save();
            console.log(chalk.green(`Updated ${car.rego} location to ${car.location}, notes: ${car.notes}`));
          } else if (make === "Car" && !rego) {
            console.log(chalk.yellow("No specific car identified for location update, skipping."));
          } else {
            console.log(chalk.yellow(`No matching car found for location update query: ${JSON.stringify(query)}`));
          }
        } catch (error) {
          console.error(chalk.red(`Error updating car location: ${error.message}`));
        }
      }
    } else if (category === "To Do") {
      // Handle to-do tasks (to be implemented)
      console.log(chalk.blue("To Do data received:", categories[category]));
    } else if (category === "Notes") {
      // Handle notes (to be implemented)
      console.log(chalk.blue("Notes data received:", categories[category]));
    }
  }

  res.sendStatus(200);
});

// CSV file upload route to add new cars
app.post('/api/cars/upload-csv', authenticateToken, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const mongoose = require('mongoose');
    const Car = mongoose.model('Car');
    const newCars = [];

    console.log(chalk.blue(`Processing CSV file: ${req.file.path}`));

    const parser = parse({ delimiter: ',', columns: true, skip_empty_lines: true, quote: '"' });
    const fileStream = fs.createReadStream(req.file.path);

    fileStream
      .pipe(parser)
      .on('data', async (row) => {
        try {
          console.log(chalk.blue('Processing row:'), row);

          const requiredColumns = ['Make', 'Model', 'Series', 'Badge', 'CompYear', 'Colour', 'REGO'];
          const hasRequiredColumns = requiredColumns.every(col => row[col] !== undefined);
          if (!hasRequiredColumns) {
            console.log(chalk.yellow(`Skipping row due to missing required columns: ${JSON.stringify(row)}`));
            return;
          }

          const existingCar = await Car.findOne({ rego: row.REGO });
          if (!existingCar) {
            const newCar = new Car({
              make: row.Make,
              model: row.Model,
              series: row.Series,
              badge: row.Badge,
              year: parseInt(row.CompYear, 10) || undefined,
              description: row.Colour, // Color is part of description
              rego: row.REGO,
              stage: 'In Works',
              photos: [],
              checklist: [],
              notes: '',
              history: [],
            });

            await newCar.save();
            newCars.push({
              make: row.Make,
              model: row.Model,
              rego: row.REGO,
            });
            console.log(chalk.green(`Added new car: ${row.REGO}`));
          } else {
            console.log(chalk.yellow(`Car with REGO ${row.REGO} already exists, skipping.`));
          }
        } catch (err) {
          console.error(chalk.red(`Error processing row: ${JSON.stringify(row)}`), err);
        }
      })
      .on('end', () => {
        console.log(chalk.green('Finished processing CSV file'));
        fs.unlinkSync(req.file.path);
        res.status(200).json({ message: 'CSV processed successfully', newCars });
      })
      .on('error', (err) => {
        console.error(chalk.red('CSV parsing error:'), err);
        fs.unlinkSync(req.file.path);
        res.status(500).json({ message: 'Error processing CSV', error: err.message });
      });

  } catch (err) {
    console.error(chalk.red('Upload route error:'), err);
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
    if (planIndex === -1) {
      return res.status(404).json({ message: 'Plan not found' });
    }
    plans[planIndex] = { ...plans[planIndex], ...req.body };
    fs.writeFileSync(path.join(__dirname, 'plans.json'), JSON.stringify(plans, null, 2));
    res.status(200).json({ message: 'Plan updated successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Error updating plan', error: err.message });
  }
});

// Basic route
app.get('/', (req, res) => {
  console.log(chalk.blue('Received request for /'));
  res.send('Welcome to NPAI Car Yard API');
});

// Process pending location updates every minute
setInterval(async () => {
  console.log(chalk.blue('Checking for pending location updates...'));
  await processPendingLocationUpdates();
}, 60 * 1000);

// Global error handler
app.use((err, req, res, next) => {
  console.error(chalk.red(`Unhandled error in ${req.method} ${req.path}:`, err.message, err.stack));
  res.status(500).json({ message: 'Internal Server Error' }); // Hide error details in production
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(chalk.green(`Server running on port ${PORT}`));
  startCronJobs();
  console.log(chalk.green('Cron jobs started'));
});