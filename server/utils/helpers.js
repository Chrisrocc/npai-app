const Car = require('../models/Cars');
const chalk = require('chalk');

const updateCarHistory = async (carId, newLocation, cleanedMessage) => {
  try {
    const car = await Car.findById(carId);
    if (!car) {
      console.error(chalk.red(`Car not found for ID: ${carId}`));
      return false;
    }

    if (car.location === newLocation) {
      console.log(chalk.cyan(`Location unchanged for ${car.make} ${car.model}: ${newLocation}`));
      return true;
    }

    console.log(chalk.cyan(`Scheduling location change for ${car.make} ${car.model}: ${car.location} -> ${newLocation}`));

    car.pendingLocationUpdate = {
      location: newLocation,
      scheduledAt: new Date(),
      message: cleanedMessage || 'Location update',
    };
    car.location = newLocation;
    car.status = ''; // Reset status on location change, aligning with CarList.js logic

    car.markModified('pendingLocationUpdate');

    await car.save();
    console.log(chalk.green(`Scheduled location update for ${car.make} ${car.model}: ${newLocation}, Current Location: ${car.location}`));

    const savedCar = await Car.findById(carId);
    console.log(chalk.yellow(`Debug: Car after save - pendingLocationUpdate: ${JSON.stringify(savedCar.pendingLocationUpdate)}`));

    if (!savedCar.pendingLocationUpdate) {
      console.error(chalk.red(`pendingLocationUpdate not saved for car ID ${carId}`));
      return false;
    }

    return true;
  } catch (e) {
    console.error(chalk.red(`Error scheduling location update for car ID ${carId}:`, e.message, e.stack));
    return false;
  }
};

const processPendingLocationUpdates = async () => {
  try {
    console.log(chalk.blue('Starting to process pending location updates...'));
    const cars = await Car.find({ pendingLocationUpdate: { $ne: null } });
    console.log(chalk.blue(`Found ${cars.length} cars with pending location updates`));

    if (!cars.length) {
      return; // Exit early if no cars to process
    }

    const currentTime = new Date();

    for (const car of cars) {
      try {
        const { pendingLocationUpdate } = car;
        if (!pendingLocationUpdate || !pendingLocationUpdate.scheduledAt || !pendingLocationUpdate.location) {
          console.log(chalk.yellow(`Invalid pending update for car ${car.make} ${car.model}, clearing it`));
          car.pendingLocationUpdate = null;
          await car.save();
          continue;
        }

        const scheduledTime = new Date(pendingLocationUpdate.scheduledAt);
        if (isNaN(scheduledTime.getTime())) {
          console.log(chalk.yellow(`Invalid scheduledAt date for car ${car.make} ${car.model}, clearing it`));
          car.pendingLocationUpdate = null;
          await car.save();
          continue;
        }

        const timeDiff = (currentTime - scheduledTime) / 1000;
        console.log(chalk.blue(`Car ${car.make} ${car.model}: Time difference is ${timeDiff} seconds`));

        if (timeDiff >= 10) { // 10 seconds for testing
          console.log(chalk.cyan(`Processing pending location update for ${car.make} ${car.model}: ${car.location}`));

          const recheckedCar = await Car.findById(car._id);
          if (!recheckedCar) {
            console.error(chalk.red(`Car not found during history update for ID: ${car._id}`));
            continue;
          }

          const updatedHistory = [...(recheckedCar.history || [])];
          const currentEntry = updatedHistory.find(entry => entry.dateLeft === null);
          if (currentEntry) {
            currentEntry.dateLeft = new Date();
            console.log(chalk.blue(`Updated dateLeft for history entry: ${currentEntry.location} to ${currentEntry.dateLeft}`));
          }
          updatedHistory.push({ 
            location: recheckedCar.location,
            dateAdded: new Date(), 
            dateLeft: null,
            message: pendingLocationUpdate.message || 'Location update'
          });
          console.log(chalk.blue(`Added new history entry: ${recheckedCar.location}`));

          const updatedNext = (recheckedCar.next || []).filter(
            entry => entry.location !== recheckedCar.location
          );
          console.log(chalk.blue(`Updated next list: Removed ${recheckedCar.location}, New next list: ${updatedNext.map(entry => entry.location).join(', ')}`));

          recheckedCar.history = updatedHistory;
          recheckedCar.next = updatedNext;
          recheckedCar.pendingLocationUpdate = null;

          await recheckedCar.save();
          console.log(chalk.green(`Applied location update for ${car.make} ${car.model}: ${recheckedCar.location}, Next: ${updatedNext.map(entry => entry.location).join(', ')}`));
        } else {
          console.log(chalk.blue(`Car ${car.make} ${car.model}: Not enough time has passed (${timeDiff} < 10 seconds), skipping`));
        }
      } catch (e) {
        console.error(chalk.red(`Error processing car ${car._id}:`, e.message));
      }
    }
    console.log(chalk.blue('Finished processing pending location updates'));
  } catch (e) {
    console.error(chalk.red('Error processing pending location updates:', e.message, e.stack));
  }
};

const determineReconditionerCategory = (reconditionerName) => {
  if (!reconditionerName) return 'other';
  const nameLower = reconditionerName.toLowerCase();

  if (nameLower.includes('rick')) return 'interior minor';
  if (['dents', 'anth', 'anth dents', 'ermin'].some(keyword => nameLower.includes(keyword))) return 'dents';
  if (['gan', 'jan', 'gian'].some(keyword => nameLower.includes(keyword))) return 'auto electrical';
  if (['brad floyd', 'battery', 'aerial'].some(keyword => nameLower.includes(keyword))) return 'battery';
  if (['peter mode', 'mode', 'goren', 'gas', 'regas', 'compressor'].some(keyword => nameLower.includes(keyword))) return 'A/C';
  if (['national', 'billie'].some(keyword => nameLower.includes(keyword))) return 'Windscreen';
  if (['richo', 'tint'].some(keyword => nameLower.includes(keyword))) return 'Tint';
  if (['browny', 'touch up brownie', 'darrel'].some(keyword => nameLower.includes(keyword))) return 'Touch Up';
  if (['keith', 'alloy wheels', 'chinamen'].some(keyword => nameLower.includes(keyword))) return 'wheels';

  return 'other';
};

module.exports = { updateCarHistory, determineReconditionerCategory, processPendingLocationUpdates };