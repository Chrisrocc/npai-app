const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const path = require('path');
const { log } = require('./logger');
const Car = require('./models/Cars'); // Import Car model
const { updateDatabaseFromPipeline } = require('./services/databaseUpdate');
const telegramRoutes = require('./routes/telegram'); // Assuming you have this for Telegram handling
const reconAppointmentRoutes = require('./routes/reconAppointments'); // Assuming you have this for API routes

dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files (e.g., uploaded photos)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

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

// Routes
app.use('/api/telegram', telegramRoutes);
app.use('/api/reconappointments', authenticateToken, reconAppointmentRoutes);

// Handle invalid S3 URL requests
app.use((req, res, next) => {
  if (req.originalUrl.startsWith('/https://npai-car-photos.s3')) {
    log('warn', `Rejecting invalid S3 URL request: ${req.originalUrl}`);
    return res.status(400).json({ error: 'Invalid S3 URL request' });
  }
  next();
});

// Process pending location updates
const processPendingLocationUpdates = async () => {
  try {
    log('info', 'Starting to process pending location updates...');
    const cars = await Car.find({ pendingLocationUpdate: { $ne: null } });
    log('info', `Found ${cars.length} cars with pending location updates`);

    for (const car of cars) {
      const updateData = {
        location: car.pendingLocationUpdate,
        pendingLocationUpdate: null,
      };
      await Car.findByIdAndUpdate(car._id, updateData, { new: true });
      log('telegram', `Processed pending location update for ${car.make} ${car.model} ${car.rego} to ${car.pendingLocationUpdate}`);
    }
  } catch (err) {
    log('error', `Error processing pending location updates: ${err.message}`);
  }
};

// Run location update processing every minute
setInterval(processPendingLocationUpdates, 60 * 1000);

// Root route
app.get('/', authenticateToken, (req, res) => {
  log('info', `Incoming request: ${req.method} ${req.originalUrl} - Body: ${JSON.stringify(req.body)}`);
  res.json({ message: 'Welcome to NPAI API' });
});

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(() => {
  log('info', 'Connected to MongoDB');
}).catch((err) => {
  log('error', `MongoDB connection error: ${err.message}`);
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  log('info', `Server running on port ${PORT} in ${process.env.NODE_ENV} environment`);
});