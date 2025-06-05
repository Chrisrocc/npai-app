const mongoose = require('mongoose');
const Car = require('./models/Cars'); // Path to your Car model, since the script is in the root

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/npaiDB', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const migrateNextField = async () => {
  try {
    console.log('Starting migration of next field...');

    // Find all cars
    const cars = await Car.find({});

    for (const car of cars) {
      // Skip if next is already an array (already migrated)
      if (Array.isArray(car.next)) {
        console.log(`Car ${car.rego} already migrated, skipping...`);
        continue;
      }

      // If next is a string, convert it to the new format
      if (typeof car.next === 'string' && car.next.trim() !== '') {
        car.next = [{ location: car.next, created: new Date() }];
      } else {
        car.next = [];
      }

      // Save the updated car
      await car.save();
      console.log(`Migrated car ${car.rego}: next field updated`);
    }

    console.log('Migration completed successfully!');
  } catch (err) {
    console.error('Error during migration:', err);
  } finally {
    mongoose.connection.close();
  }
};

migrateNextField();