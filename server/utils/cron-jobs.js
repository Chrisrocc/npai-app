const cron = require('node-cron');
const Car = require('../models/Cars');
const fs = require('fs');
const path = require('path');
const chalk = require('chalk');

const startCronJobs = () => {
  cron.schedule('0 0 * * *', async () => {
    console.log(chalk.blue('Running job to delete photos from archived cars older than 3 months...'));
    try {
      const threeMonthsAgo = new Date();
      threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

      const archivedCars = await Car.find({
        archived: true,
        archivedAt: { $lt: threeMonthsAgo },
        photos: { $ne: [] },
      });

      if (!archivedCars.length) {
        console.log(chalk.blue('No archived cars older than 3 months with photos found.'));
        return;
      }

      for (const car of archivedCars) {
        try {
          console.log(chalk.blue(`Processing archived car: ${car._id} (${car.make} ${car.model})`));
          if (car.photos && car.photos.length > 0) {
            for (const photoPath of car.photos) {
              const fullPath = path.join(__dirname, '..', photoPath);
              if (fs.existsSync(fullPath)) {
                fs.unlinkSync(fullPath);
                console.log(chalk.green(`Deleted photo: ${photoPath}`));
              } else {
                console.log(chalk.yellow(`Photo not found: ${photoPath}`));
              }
            }
            car.photos = [];
            await car.save();
            console.log(chalk.green(`Updated car ${car._id}: photos cleared`));
          }
        } catch (err) {
          console.error(chalk.red(`Error processing car ${car._id}:`, err.message));
        }
      }
      console.log(chalk.green('Photo deletion job completed.'));
    } catch (err) {
      console.error(chalk.red('Error in photo deletion job:', err.message, err.stack));
    }
  });
};

module.exports = { startCronJobs };