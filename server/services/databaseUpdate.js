const Car = require('../models/Cars');
const CustomerAppointment = require('../models/CustomerAppointment');
const ReconAppointment = require('../models/ReconAppointment');
const ManualVerification = require('../models/ManualVerification');
const Task = require('../models/Tasks');
const Note = require('../models/Note');
const { identifyUniqueCar } = require('../utils/carIdentification');
const { updateCarHistory, determineReconditionerCategory } = require('../utils/helpers');
const { log } = require('../logger');
const fs = require('fs');
const path = require('path');

// Path to store plans
const plansFilePath = path.join(__dirname, '../plans.json');

// Initialize plans file if it doesn't exist
if (!fs.existsSync(plansFilePath)) {
  fs.writeFileSync(plansFilePath, JSON.stringify([]));
}

// Function to read plans
const readPlans = () => {
  try {
    const data = fs.readFileSync(plansFilePath, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    log('error', `Error reading plans file: ${err.message}`);
    return [];
  }
};

// Function to write plans
const writePlans = (plans) => {
  try {
    fs.writeFileSync(plansFilePath, JSON.stringify(plans, null, 2));
  } catch (err) {
    log('error', `Error writing plans file: ${err.message}`);
  }
};

// Update MongoDB based on pipeline output
const updateDatabaseFromPipeline = async (pipelineOutput) => {
  if (pipelineOutput.error) {
    log('error', `Pipeline error: ${pipelineOutput.error}`);
    return;
  }

  const { categories, photoRegos, isPlan } = pipelineOutput;

  // Process Ready
  for (const entry of categories.Ready) {
    try {
      const data = entry.data || [];
      const make = data[0] || '';
      const model = data[1] || '';
      const badge = data[2] || '';
      const description = data[3] || '';
      const rego = data[4] || '';
      const currentLocation = data[5] || '';
      const readyStatus = data[6] || '';
      const notes = data[7] || '';

      log('telegram', `Processing Ready: [${[make, model, badge, description, rego, currentLocation, readyStatus, notes].map(item => item || '').join(', ')}]`);

      const cleanedMessage = entry.message.replace(/^-+\s*/, '').trim();
      if (!cleanedMessage) {
        throw new Error('Message is empty after cleaning');
      }

      const result = await identifyUniqueCar(make, model, badge, rego, description, currentLocation, entry.fromPhoto);

      let carToUpdate;
      if (result.status === 'found') {
        carToUpdate = result.car;
        log('telegram', `Car found: ${carToUpdate.make} ${carToUpdate.model} ${carToUpdate.rego}`);
      } else if (rego) {
        log('telegram', `Car with rego ${rego} not found, creating new car`);
        const newCar = new Car({
          make,
          model,
          badge,
          description,
          rego,
          location: currentLocation || '',
          status: readyStatus || '',
          notes: notes || '',
          next: [],
          checklist: [],
          year: null,
          history: [],
          photos: [],
          stage: 'In Works'
        });
        await newCar.save();
        carToUpdate = newCar;
        log('telegram', `Created new car: ${newCar.make} ${newCar.model} ${newCar.rego}`);
      } else {
        const manualEntry = new ManualVerification({
          message: cleanedMessage,
          category: 'Ready',
          data: [make, model, badge, description, rego, currentLocation, readyStatus, notes]
        });
        await manualEntry.save();
        log('telegram', `Sent to manual verification`);
        continue;
      }

      try {
        const updateData = {
          location: currentLocation || carToUpdate.location,
          status: readyStatus || carToUpdate.status,
          description: description || carToUpdate.description,
          notes: notes ? (carToUpdate.notes ? `${carToUpdate.notes}; ${notes}` : notes) : carToUpdate.notes,
        };

        if (currentLocation && currentLocation !== carToUpdate.location) {
          const historyUpdated = await updateCarHistory(carToUpdate._id, currentLocation, cleanedMessage);
          if (!historyUpdated) {
            throw new Error('Failed to schedule history update');
          }
          log('telegram', `Scheduled location update to ${currentLocation} for ${carToUpdate.make} ${carToUpdate.model} ${carToUpdate.rego}`);
        } else {
          await Car.findByIdAndUpdate(carToUpdate._id, updateData, { new: true });
          log('telegram', `Updated car status to ${updateData.status} at ${updateData.location}`);
        }
      } catch (e) {
        log('error', `Error updating car: ${e.message}`);
      }
    } catch (e) {
      log('error', `Error processing Ready entry: ${e.message}`);
      if (e.name === 'ValidationError') {
        log('error', `Validation error details: ${JSON.stringify(e.errors)}`);
      }
    }
  }

  // Process Drop Off
  for (const entry of categories['Drop Off']) {
    try {
      const data = entry.data || [];
      const make = data[0] || '';
      const model = data[1] || '';
      const badge = data[2] || '';
      const description = data[3] || '';
      const rego = data[4] || '';
      const currentLocation = data[5] || '';
      const nextLocation = data[6] || '';
      const notes = data[7] || '';

      log('telegram', `Processing Drop Off: [${[make, model, badge, description, rego, currentLocation, nextLocation, notes].map(item => item || '').join(', ')}]`);

      const cleanedMessage = entry.message.replace(/^-+\s*/, '').trim();
      if (!cleanedMessage) {
        throw new Error('Message is empty after cleaning');
      }

      const result = await identifyUniqueCar(make, model, badge, rego, description, currentLocation, entry.fromPhoto);

      let carToUpdate;
      if (result.status === 'found') {
        carToUpdate = result.car;
        log('telegram', `Car found: ${carToUpdate.make} ${carToUpdate.model} ${carToUpdate.rego}`);
      } else if (rego) {
        log('telegram', `Car with rego ${rego} not found, creating new car`);
        const newCar = new Car({
          make,
          model,
          badge,
          description,
          rego,
          location: currentLocation || '',
          next: nextLocation ? [{ location: nextLocation, created: new Date() }] : [],
          notes: notes || '',
          checklist: [],
          year: null,
          history: [],
          photos: [],
          stage: 'In Works'
        });
        await newCar.save();
        carToUpdate = newCar;
        log('telegram', `Created new car: ${newCar.make} ${newCar.model} ${newCar.rego}`);
      } else if (isPlan) {
        const plans = readPlans();
        const planId = Date.now() + Math.random().toString(36).substr(2, 9);
        const planEntry = {
          id: planId,
          message: cleanedMessage,
          category: 'Location Update',
          data: [make, model, badge, description, rego, currentLocation, nextLocation, notes],
          fromPhoto: entry.fromPhoto,
          identifiedCar: null,
          status: 'pending',
        };
        plans.push(planEntry);
        writePlans(plans);
        log('telegram', `Added to Plan tab for approval (Drop Off converted to Location Update, car not identified)`);
        continue;
      } else {
        const manualEntry = new ManualVerification({
          message: cleanedMessage,
          category: 'Drop Off',
          data: [make, model, badge, description, rego, currentLocation, nextLocation, notes]
        });
        await manualEntry.save();
        log('telegram', `Sent to manual verification`);

        try {
          const carItem = {
            car: null,
            carDetails: {
              make,
              model,
              badge,
              description,
              rego
            },
            comment: ''
          };
          const taskEntry = new Task({
            name: cleanedMessage,
            dayTime: new Date().toLocaleDateString(),
            carItems: [carItem]
          });
          await taskEntry.save();
          log('telegram', `Created drop off task with car details`);
        } catch (e) {
          log('error', `Error creating task for Drop Off: ${e.message}`);
        }
        continue;
      }

      if (isPlan) {
        const plans = readPlans();
        const planId = Date.now() + Math.random().toString(36).substr(2, 9);
        const planEntry = {
          id: planId,
          message: cleanedMessage,
          category: 'Location Update',
          data: [make, model, badge, description, rego, currentLocation, nextLocation, notes],
          fromPhoto: entry.fromPhoto,
          identifiedCar: {
            id: carToUpdate._id,
            make: carToUpdate.make,
            model: carToUpdate.model,
            rego: carToUpdate.rego,
            description: carToUpdate.description,
          },
          status: 'pending',
        };
        plans.push(planEntry);
        writePlans(plans);
        log('telegram', `Added to Plan tab for approval (Drop Off converted to Location Update)`);
      } else {
        try {
          const updatedNext = nextLocation
            ? [...(carToUpdate.next || []), { location: nextLocation, created: new Date() }]
            : carToUpdate.next;

          const updateData = {
            location: currentLocation || carToUpdate.location,
            next: updatedNext,
            description: description || carToUpdate.description,
            notes: notes ? (carToUpdate.notes ? `${carToUpdate.notes}; ${notes}` : notes) : carToUpdate.notes,
          };

          if (currentLocation && currentLocation !== carToUpdate.location) {
            const historyUpdated = await updateCarHistory(carToUpdate._id, currentLocation, cleanedMessage);
            if (!historyUpdated) {
              throw new Error('Failed to schedule history update');
            }
            log('telegram', `Scheduled location update to ${currentLocation} for ${carToUpdate.make} ${carToUpdate.model} ${carToUpdate.rego}`);
          } else {
            await Car.findByIdAndUpdate(carToUpdate._id, updateData, { new: true });
            log('telegram', `Updated car location to ${updateData.location}, next location set to ${updateData.next.map(entry => entry.location).join(', ')}`);
          }

          const carItem = {
            car: carToUpdate._id,
            carDetails: {
              make: carToUpdate.make,
              model: carToUpdate.model,
              badge: carToUpdate.badge,
              description: carToUpdate.description,
              rego: carToUpdate.rego
            },
            comment: ''
          };
          const taskEntry = new Task({
            name: cleanedMessage,
            dayTime: new Date().toLocaleDateString(),
            carItems: [carItem]
          });
          await taskEntry.save();
          log('telegram', `Created drop off task`);
        } catch (e) {
          log('error', `Error updating car for Drop Off: ${e.message}`);
        }
      }
    } catch (e) {
      log('error', `Error processing Drop Off entry: ${e.message}`);
      if (e.name === 'ValidationError') {
        log('error', `Validation error details: ${JSON.stringify(e.errors)}`);
      }
    }
  }

  // Process Customer Appointment
  for (const entry of categories['Customer Appointment']) {
    try {
      const data = entry.data || [];
      const make = data[0] || '';
      const model = data[1] || '';
      const badge = data[2] || '';
      const description = data[3] || '';
      const rego = data[4] || '';
      const customerName = data[5] || '';
      const day = data[6] || '';
      const time = data[7] || '';
      const notes = data[8] || '';
      const delivery = data[9] || '';

      log('telegram', `Processing Customer Appointment: [${[make, model, badge, description, rego, customerName, day, time, notes, delivery].map(item => item || '').join(', ')}]`);

      const cleanedMessage = entry.message.replace(/^-+\s*/, '').trim();
      if (!cleanedMessage) {
        throw new Error('Message is empty after cleaning');
      }

      const result = await identifyUniqueCar(make, model, badge, rego, description, null, entry.fromPhoto);
      const allowedStages = ['Online', 'In Works/Online', 'Sold'];

      let carDetails;
      if (result.status === 'found') {
        const carStage = result.car.stage || 'In Works';
        if (!allowedStages.includes(carStage)) {
          const manualEntry = new ManualVerification({
            message: cleanedMessage,
            category: 'Customer Appointment',
            data: [make, model, badge, description, rego, customerName, day, time, notes, delivery],
            reason: `Car stage "${carStage}" not allowed for customer appointment`
          });
          await manualEntry.save();
          log('telegram', `Sent to manual verification due to car stage "${carStage}"`);
          continue;
        }

        carDetails = {
          id: result.car._id,
          make: result.car.make,
          model: result.car.model,
          badge: result.car.badge,
          description: result.car.description,
          rego: result.car.rego
        };
        log('telegram', `Car found: ${result.car.make} ${result.car.model} ${result.car.rego}`);
      } else if (rego) {
        log('telegram', `Car with rego ${rego} not found, creating new car`);
        const newCar = new Car({
          make,
          model,
          badge,
          description,
          rego,
          location: '',
          notes: notes || '',
          next: [],
          checklist: [],
          year: null,
          history: [],
          photos: [],
          stage: 'In Works'
        });
        await newCar.save();
        carDetails = {
          id: newCar._id,
          make: newCar.make,
          model: newCar.model,
          badge: newCar.badge,
          description: newCar.description,
          rego: newCar.rego
        };
        log('telegram', `Created new car: ${newCar.make} ${newCar.model} ${newCar.rego}`);
      } else {
        carDetails = {
          id: null,
          make,
          model,
          badge,
          description,
          rego
        };
      }

      try {
        const appointment = new CustomerAppointment({
          name: customerName,
          dayTime: `${day}${time ? ` ${time}` : ''}`.trim(),
          car: carDetails.id,
          carDetails: {
            make: carDetails.make,
            model: carDetails.model,
            badge: carDetails.badge,
            description: carDetails.description,
            rego: carDetails.rego
          },
          comments: notes || '',
          source: 'manual',
          delivery: delivery === 'delivery'
        });
        await appointment.save();
        log('telegram', carDetails.id ? `Added customer appointment for ${carDetails.make} ${carDetails.model} ${carDetails.rego}` : `Added customer appointment with car details`);
      } catch (e) {
        log('error', carDetails.id ? `Error saving customer appointment: ${e.message}` : `Error saving customer appointment with car details: ${e.message}`);
      }
    } catch (e) {
      log('error', `Error processing Customer Appointment entry: ${e.message}`);
      if (e.name === 'ValidationError') {
        log('error', `Validation error details: ${JSON.stringify(e.errors)}`);
      }
    }
  }

  // Process Reconditioning Appointment
  for (const entry of categories['Reconditioning Appointment']) {
    try {
      const data = entry.data || [];
      const make = data[0] || '';
      const model = data[1] || '';
      const badge = data[2] || '';
      const description = data[3] || '';
      const rego = data[4] || '';
      const reconditionerName = data[5] || '';
      const day = data[6] || '';
      const time = data[7] || '';
      const notes = data[8] || '';

      log('telegram', `Processing Reconditioning Appointment: [${[make, model, badge, description, rego, reconditionerName, day, time, notes].map(item => item || '').join(', ')}]`);

      const cleanedMessage = entry.message.replace(/^-+\s*/, '').trim();
      if (!cleanedMessage) {
        throw new Error('Message is empty after cleaning');
      }

      const result = await identifyUniqueCar(make, model, badge, rego, description, null, entry.fromPhoto);

      let carItem;
      if (result.status === 'found') {
        carItem = {
          car: result.car._id,
          carDetails: {
            make: result.car.make,
            model: result.car.model,
            badge: result.car.badge,
            description: result.car.description,
            rego: result.car.rego
          },
          comment: notes || ''
        };
        log('telegram', `Car found: ${result.car.make} ${result.car.model} ${result.car.rego}`);
      } else if (rego) {
        log('telegram', `Car with rego ${rego} not found, creating new car`);
        const newCar = new Car({
          make,
          model,
          badge,
          description,
          rego,
          location: '',
          notes: notes || '',
          next: [],
          checklist: [],
          year: null,
          history: [],
          photos: [],
          stage: 'In Works'
        });
        await newCar.save();
        carItem = {
          car: newCar._id,
          carDetails: {
            make: newCar.make,
            model: newCar.model,
            badge: newCar.badge,
            description: newCar.description,
            rego: newCar.rego
          },
          comment: notes || ''
        };
        log('telegram', `Created new car: ${newCar.make} ${newCar.model} ${newCar.rego}`);
      } else {
        carItem = {
          car: null,
          carDetails: {
            make,
            model,
            badge,
            description,
            rego
          },
          comment: notes || ''
        };
      }

      const reconditionerCategory = determineReconditionerCategory(reconditionerName);

      try {
        const appointment = new ReconAppointment({
          reconditionerName,
          dayTime: `${day}${time ? ` ${time}` : ''}`.trim(),
          carItems: [carItem],
          category: reconditionerCategory
        });
        await appointment.save();
        log('telegram', `Added reconditioning appointment for ${make} ${model} ${rego || ''}`);
      } catch (e) {
        log('error', `Error saving reconditioning appointment: ${e.message}`);
      }
    } catch (e) {
      log('error', `Error processing Reconditioning Appointment entry: ${e.message}`);
      if (e.name === 'ValidationError') {
        log('error', `Validation error details: ${JSON.stringify(e.errors)}`);
      }
    }
  }

  // Process Car Repairs
  for (const entry of categories['Car Repairs']) {
    try {
      const data = entry.data || [];
      const make = data[0] || '';
      const model = data[1] || '';
      const badge = data[2] || '';
      const description = data[3] || '';
      const rego = data[4] || '';
      const repairTask = data[5] || '';
      const notes = data[6] || '';
      const reconditionerInfo = entry.reconditioner || { category: 'other', reconditioner: 'Technician' };

      log('telegram', `Processing Car Repairs: [${[make, model, badge, description, rego, repairTask, notes].map(item => item || '').join(', ')}]`);
      log('telegram', `Assigned reconditioner: ${reconditionerInfo.reconditioner} (Category: ${reconditionerInfo.category})`);

      const cleanedMessage = entry.message.replace(/^-+\s*/, '').trim();
      if (!cleanedMessage) {
        throw new Error('Message is empty after cleaning');
      }

      const result = await identifyUniqueCar(make, model, badge, rego, description, null, entry.fromPhoto);

      let carToUpdate;
      if (result.status === 'found') {
        carToUpdate = result.car;
        log('telegram', `Car found: ${carToUpdate.make} ${carToUpdate.model} ${carToUpdate.rego}`);
        if (process.env.DEBUG_MODE === 'true') {
          log('debug', `Current checklist: ${JSON.stringify(carToUpdate.checklist)}`);
        }
      } else if (rego) {
        log('telegram', `Car with rego ${rego} not found, creating new car`);
        const newCar = new Car({
          make,
          model,
          badge,
          description,
          rego,
          checklist: repairTask ? [repairTask] : [],
          location: '',
          notes: notes || '',
          next: [],
          year: null,
          history: [],
          photos: [],
          stage: 'In Works'
        });
        await newCar.save();
        carToUpdate = newCar;
        log('telegram', `Created new car: ${newCar.make} ${newCar.model} ${newCar.rego}`);
      } else {
        const manualEntry = new ManualVerification({
          message: cleanedMessage,
          category: 'Car Repairs',
          data: [make, model, badge, description, rego, repairTask, notes]
        });
        await manualEntry.save();
        log('telegram', `Sent to manual verification`);
        continue;
      }

      try {
        const updateData = {
          checklist: repairTask ? [...(carToUpdate.checklist || []), repairTask] : carToUpdate.checklist,
          description: description || carToUpdate.description,
          notes: notes ? (carToUpdate.notes ? `${carToUpdate.notes}; ${notes}` : notes) : carToUpdate.notes,
        };
        if (process.env.DEBUG_MODE === 'true') {
          log('debug', `Attempting to update with checklist: ${JSON.stringify(updateData.checklist)}`);
        }

        const updatedCar = await Car.findByIdAndUpdate(carToUpdate._id, updateData, { new: true, runValidators: true });

        if (!updatedCar) {
          log('error', `Failed to update car: Document not found`);
          continue;
        }

        if (repairTask && updatedCar.checklist.includes(repairTask)) {
          log('telegram', `Successfully updated car checklist with repair task: ${repairTask}`);
        } else if (repairTask) {
          log('error', `Failed to update car checklist: Repair task "${repairTask}" not added`);
          if (process.env.DEBUG_MODE === 'true') {
            log('debug', `Updated checklist: ${JSON.stringify(updatedCar.checklist)}`);
          }
        } else {
          log('telegram', `No repair task to add, checklist unchanged`);
        }

        // Create reconditioner appointment
        const carItem = {
          car: carToUpdate._id,
          carDetails: {
            make: carToUpdate.make,
            model: carToUpdate.model,
            badge: carToUpdate.badge,
            description: carToUpdate.description,
            rego: carToUpdate.rego
          },
          comment: repairTask || ''
        };

        const appointment = new ReconAppointment({
          reconditionerName: reconditionerInfo.reconditioner,
          dayTime: 'Could be today', // Default since no specific time is provided
          carItems: [carItem],
          category: reconditionerInfo.category.replace(/['"]/g, '') // Strip quotes from category
        });

        await appointment.save();
        log('telegram', `Created reconditioning appointment for ${carToUpdate.make} ${carToUpdate.model} ${carToUpdate.rego} with ${reconditionerInfo.reconditioner} (Category: ${reconditionerInfo.category})`);

      } catch (e) {
        log('error', `Error updating car or creating reconditioning appointment for Car Repairs: ${e.message}`);
        if (e.name === 'ValidationError') {
          log('error', `Validation error details: ${JSON.stringify(e.errors)}`);
        }
      }
    } catch (e) {
      log('error', `Error processing Car Repairs entry: ${e.message}`);
      if (e.name === 'ValidationError') {
        log('error', `Validation error details: ${JSON.stringify(e.errors)}`);
      }
    }
  }

  // Process Location Update
  for (const entry of categories['Location Update']) {
    try {
      const data = entry.data || [];
      const make = data[0] || '';
      const model = data[1] || '';
      const badge = data[2] || '';
      const description = data[3] || '';
      const rego = data[4] || '';
      const oldLocation = data[5] || '';
      const newLocation = data[6] || '';
      const notes = data[7] || '';

      log('telegram', `Processing Location Update: [${[make, model, badge, description, rego, oldLocation, newLocation, notes].map(item => item || '').join(', ')}]`);

      const cleanedMessage = entry.message.replace(/^-+\s*/, '').trim();
      if (!cleanedMessage) {
        throw new Error('Message is empty after cleaning');
      }

      const result = await identifyUniqueCar(make, model, badge, rego, description, oldLocation, entry.fromPhoto);

      let carToUpdate;
      if (result.status === 'found') {
        carToUpdate = result.car;
        log('telegram', `Car found: ${carToUpdate.make} ${carToUpdate.model} ${carToUpdate.rego}`);
      } else if (rego) {
        log('telegram', `Car with rego ${rego} not found, creating new car`);
        const newCar = new Car({
          make,
          model,
          badge,
          description,
          rego,
          location: newLocation || '',
          notes: notes || '',
          next: [],
          checklist: [],
          year: null,
          history: [],
          photos: [],
          stage: 'In Works'
        });
        await newCar.save();
        carToUpdate = newCar;
        log('telegram', `Created new car: ${newCar.make} ${newCar.model} ${newCar.rego}`);
      } else if (isPlan) {
        const plans = readPlans();
        const planId = Date.now() + Math.random().toString(36).substr(2, 9);
        const planEntry = {
          id: planId,
          message: cleanedMessage,
          category: 'Location Update',
          data: [make, model, badge, description, rego, oldLocation, newLocation, notes],
          fromPhoto: entry.fromPhoto,
          identifiedCar: null,
          status: 'pending',
        };
        plans.push(planEntry);
        writePlans(plans);
        log('telegram', `Added to Plan tab for approval (car not identified)`);
        continue;
      } else {
        const manualEntry = new ManualVerification({
          message: cleanedMessage,
          category: 'Location Update',
          data: [make, model, badge, description, rego, oldLocation, newLocation, notes]
        });
        await manualEntry.save();
        log('telegram', `Sent to manual verification`);

        try {
          const carItem = {
            car: null,
            carDetails: {
              make,
              model,
              badge,
              description,
              rego
            }
          };
          const noteEntry = new Note({
            message: cleanedMessage,
            carItems: [carItem]
          });
          await noteEntry.save();
          log('telegram', `Created location update note with car details`);
        } catch (e) {
          log('error', `Error creating note for Location Update: ${e.message}`);
        }
        continue;
      }

      if (isPlan) {
        const plans = readPlans();
        const planId = Date.now() + Math.random().toString(36).substr(2, 9);
        const planEntry = {
          id: planId,
          message: cleanedMessage,
          category: 'Location Update',
          data: [make, model, badge, description, rego, oldLocation, newLocation, notes],
          fromPhoto: entry.fromPhoto,
          identifiedCar: {
            id: carToUpdate._id,
            make: carToUpdate.make,
            model: carToUpdate.model,
            rego: carToUpdate.rego,
            description: carToUpdate.description,
          },
          status: 'pending',
        };
        plans.push(planEntry);
        writePlans(plans);
        log('telegram', `Added to Plan tab for approval`);
      } else {
        try {
          const updatedNext = (carToUpdate.next || []).filter(
            entry => entry.location !== newLocation
          );

          const updateData = {
            next: updatedNext,
            description: description || carToUpdate.description,
            notes: notes ? (carToUpdate.notes ? `${carToUpdate.notes}; ${notes}` : notes) : carToUpdate.notes,
          };

          if (newLocation && newLocation !== carToUpdate.location) {
            const historyUpdated = await updateCarHistory(carToUpdate._id, newLocation, cleanedMessage);
            if (!historyUpdated) {
              throw new Error('Failed to schedule history update');
            }
            log('telegram', `Scheduled location update to ${newLocation} for ${carToUpdate.make} ${carToUpdate.model} ${carToUpdate.rego}`);
          }

          await Car.findByIdAndUpdate(carToUpdate._id, updateData, { new: true });
          log('telegram', `Updated car, next locations: ${updateData.next.map(entry => entry.location).join(', ')}`);

          const carItem = {
            car: carToUpdate._id,
            carDetails: {
              make: carToUpdate.make,
              model: carToUpdate.model,
              badge: carToUpdate.badge,
              description: carToUpdate.description,
              rego: carToUpdate.rego
            }
          };
          const noteEntry = new Note({
            message: cleanedMessage,
            carItems: [carItem]
          });
          await noteEntry.save();
          log('telegram', `Created location update note`);
        } catch (e) {
          log('error', `Error updating car for Location Update: ${e.message}`);
        }
      }
    } catch (e) {
      log('error', `Error processing Location Update entry: ${e.message}`);
      if (e.name === 'ValidationError') {
        log('error', `Validation error details: ${JSON.stringify(e.errors)}`);
      }
    }
  }

  // Process To Do
  for (const entry of categories['To Do']) {
    try {
      const data = entry.data || [];
      const make = data[0] || '';
      const model = data[1] || '';
      const badge = data[2] || '';
      const description = data[3] || '';
      const rego = data[4] || '';
      const task = data[5] || '';

      log('telegram', `Processing To Do: [${[make, model, badge, description, rego, task].map(item => item || '').join(', ')}]`);

      const cleanedMessage = entry.message.replace(/^-+\s*/, '').trim();
      if (!cleanedMessage) {
        throw new Error('Message is empty after cleaning');
      }

      if (make) {
        const result = await identifyUniqueCar(make, model, badge, rego, description, null, entry.fromPhoto);
        let carToUpdate;
        if (result.status === 'found') {
          carToUpdate = result.car;
          log('telegram', `Car found: ${carToUpdate.make} ${carToUpdate.model} ${carToUpdate.rego}`);
        } else if (rego) {
          log('telegram', `Car with rego ${rego} not found, creating new car`);
          const newCar = new Car({
            make,
            model,
            badge,
            description,
            rego,
            location: '',
            notes: task ? `To Do: ${task}` : '',
            next: [],
            checklist: [],
            year: null,
            history: [],
            photos: [],
            stage: 'In Works'
          });
          await newCar.save();
          carToUpdate = newCar;
          log('telegram', `Created new car: ${newCar.make} ${newCar.model} ${newCar.rego}`);
        } else {
          try {
            const carItem = {
              car: null,
              carDetails: {
                make,
                model,
                badge,
                description,
                rego
              },
              comment: ''
            };
            const taskEntry = new Task({
              name: cleanedMessage,
              dayTime: new Date().toLocaleDateString(),
              carItems: [carItem]
            });
            await taskEntry.save();
            log('telegram', `Created to do task with car details`);
          } catch (e) {
            log('error', `Error creating to do task with car details: ${e.message}`);
          }
          continue;
        }

        try {
          await Car.findByIdAndUpdate(
            carToUpdate._id,
            { notes: carToUpdate.notes + (task ? `; To Do: ${task}` : '') },
            { new: true }
          );

          const carItem = {
            car: carToUpdate._id,
            carDetails: {
              make: carToUpdate.make,
              model: carToUpdate.model,
              badge: carToUpdate.badge,
              description: carToUpdate.description,
              rego: carToUpdate.rego
            },
            comment: ''
          };
          const taskEntry = new Task({
            name: cleanedMessage,
            dayTime: new Date().toLocaleDateString(),
            carItems: [carItem]
          });
          await taskEntry.save();
          log('telegram', `Created to do task for ${carToUpdate.make} ${carToUpdate.model} ${carToUpdate.rego}`);
        } catch (e) {
          log('error', `Error processing To Do for car: ${e.message}`);
        }
      } else {
        try {
          const taskEntry = new Task({
            name: cleanedMessage,
            dayTime: new Date().toLocaleDateString(),
            carItems: []
          });
          await taskEntry.save();
          log('telegram', `Created to do task without car: ${cleanedMessage}`);
        } catch (e) {
          log('error', `Error creating to do task without car: ${e.message}`);
        }
      }
    } catch (e) {
      log('error', `Error processing To Do entry: ${e.message}`);
      if (e.name === 'ValidationError') {
        log('error', `Validation error details: ${JSON.stringify(e.errors)}`);
      }
    }
  }

  // Process Notes
  for (const entry of categories.Notes) {
    try {
      const data = entry.data || [];
      const make = data[0] || '';
      const model = data[1] || '';
      const badge = data[2] || '';
      const description = data[3] || '';
      const rego = data[4] || '';
      const notes = data[5] || '';

      log('telegram', `Processing Notes: [${[make, model, badge, description, rego, notes].map(item => item || '').join(', ')}]`);

      const cleanedMessage = entry.message.replace(/^-+\s*/, '').trim();
      if (!cleanedMessage) {
        throw new Error('Message is empty after cleaning');
      }

      if (make) {
        const result = await identifyUniqueCar(make, model, badge, rego, description, null, entry.fromPhoto);
        let carToUpdate;
        if (result.status === 'found') {
          carToUpdate = result.car;
          log('telegram', `Car found: ${carToUpdate.make} ${carToUpdate.model} ${carToUpdate.rego}`);
        } else if (rego) {
          log('telegram', `Car with rego ${rego} not found, creating new car`);
          const newCar = new Car({
            make,
            model,
            badge,
            description,
            rego,
            location: '',
            notes: notes || '',
            next: [],
            checklist: [],
            year: null,
            history: [],
            photos: [],
            stage: 'In Works'
          });
          await newCar.save();
          carToUpdate = newCar;
          log('telegram', `Created new car: ${newCar.make} ${newCar.model} ${newCar.rego}`);
        } else {
          try {
            const carItem = {
              car: null,
              carDetails: {
                make,
                model,
                badge,
                description,
                rego
              }
            };
            const noteEntry = new Note({
              message: cleanedMessage,
              carItems: [carItem]
            });
            await noteEntry.save();
            log('telegram', `Created note with car details`);
          } catch (e) {
            log('error', `Error creating note with car details: ${e.message}`);
          }
          continue;
        }

        try {
          const carItem = {
            car: carToUpdate._id,
            carDetails: {
              make: carToUpdate.make,
              model: carToUpdate.model,
              badge: carToUpdate.badge,
              description: carToUpdate.description,
              rego: carToUpdate.rego
            }
          };
          const noteEntry = new Note({
            message: cleanedMessage,
            carItems: [carItem]
          });
          await noteEntry.save();
          log('telegram', `Created note for ${carToUpdate.make} ${carToUpdate.model} ${carToUpdate.rego}`);
        } catch (e) {
          log('error', `Error creating note for car: ${e.message}`);
        }
      } else {
        try {
          const noteEntry = new Note({
            message: cleanedMessage,
            carItems: []
          });
          await noteEntry.save();
          log('telegram', `Created note without car: ${cleanedMessage}`);
        } catch (e) {
          log('error', `Error creating note without car: ${e.message}`);
        }
      }
    } catch (e) {
      log('error', `Error processing Notes entry: ${e.message}`);
      if (e.name === 'ValidationError') {
        log('error', `Validation error details: ${JSON.stringify(e.errors)}`);
      }
    }
  }
};

module.exports = { updateDatabaseFromPipeline };