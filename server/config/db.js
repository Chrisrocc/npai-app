const mongoose = require('mongoose');
const chalk = require('chalk');

const connectDB = async () => {
  try {
    console.log(chalk.blue('Connecting to MongoDB...'));
    await mongoose.connect(process.env.MONGO_URI);
    console.log(chalk.green('Connected to MongoDB'));
  } catch (err) {
    console.error(chalk.red('MongoDB connection error:', err));
    process.exit(1);
  }
};

module.exports = connectDB;