const Car = require('../models/Cars');
const CustomerAppointment = require('../models/CustomerAppointment');
const ReconAppointment = require('../models/ReconAppointment');
const ManualVerification = require('../models/ManualVerification');
const Task = require('../models/Tasks');
const Note = require('../models/Note');
const { identifyUniqueCar } = require('../utils/carIdentification');
const { updateCarHistory, determineReconditionerCategory } = require('../utils/helpers');
const telegramLogger = require('../telegramLogger');
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
    return [];
  }
};

// Function to write plans
const writePlans = (plans) => {
  fs.writeFileSync(plansFilePath, JSON.stringify(plans, null, 2));
};

// Update MongoDB based on pipeline output
const updateDatabaseFromPipeline = async (pipelineOutput) => {
  if (pipelineOutput.error) {
    telegramLogger(`Error: ${pipelineOutput.error}`, 'error');
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

      telegramLogger(
        `- Ready: [${[make, model, badge, description, rego, currentLocation, readyStatus, notes]
          .map(item => item || '')
          .join(', ')}]`,
        'category'
      );

      const cleanedMessage = entry.message.replace(/^-+\s*/, '').trim();
      if (!cleanedMessage) {
        throw new Error('Message is empty after cleaning');
      }

      const result = await identifyUniqueCar(make, model, badge, rego, description, currentLocation, entry.fromPhoto);

      let carToUpdate;
      if (result.status === 'found') {
        carToUpdate = result.car;
        telegramLogger(`- Car found: ${carToUpdate.make} ${carToUpdate.model} ${carToUpdate.rego}`, 'action');
      } else if (rego) {
        telegramLogger(`- Car with rego ${rego} not found, creating new car`, 'action');
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
        telegramLogger(`- Created new car: ${newCar.make} ${newCar.model} ${newCar.rego}`, 'action');
      } else {
        const manualEntry = new ManualVerification({
          message: cleanedMessage,
          category: 'Ready',
          data: [make, model, badge, description, rego, currentLocation, readyStatus, notes]
        });
        await manualEntry.save();
        telegramLogger(`- Sent to manual verification`, 'action');
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
        } else {
          await Car.findByIdAndUpdate(carToUpdate._id, updateData, { new: true });
        }

        telegramLogger(`- Updated car status to ${updateData.status} at ${updateData.location}`, 'action');
      } catch (e) {
        telegramLogger(`- Error updating car: ${e.message}`, 'action');
      }
    } catch (e) {
      telegramLogger(`- Error processing Ready entry: ${e.message}`, 'action');
      if (e.name === 'ValidationError') {
        telegramLogger(`- Validation error details: ${JSON.stringify(e.errors)}`, 'action');
      }
    }
  }

  // Process Drop Off (convert to Location Update if part of a plan)
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

      telegramLogger(
        `- Drop Off: [${[make, model, badge, description, rego, currentLocation, nextLocation, notes]
          .map(item => item || '')
          .join(', ')}]`,
        'category'
      );

      const cleanedMessage = entry.message.replace(/^-+\s*/, '').trim();
      if (!cleanedMessage) {
        throw new Error('Message is empty after cleaning');
      }

      const result = await identifyUniqueCar(make, model, badge, rego, description, currentLocation, entry.fromPhoto);

      let carToUpdate;
      if (result.status === 'found') {
        carToUpdate = result.car;
        telegramLogger(`- Car found: ${carToUpdate.make} ${carToUpdate.model} ${carToUpdate.rego}`, 'action');
      } else if (rego) {
        telegramLogger(`- Car with rego ${rego} not found, creating new car`, 'action');
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
        telegramLogger(`- Created new car: ${newCar.make} ${newCar.model} ${newCar.rego}`, 'action');
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
        telegramLogger(`- Added to Plan tab for approval (Drop Off converted to Location Update, car not identified)`, 'action');
        continue;
      } else {
        const manualEntry = new ManualVerification({
          message: cleanedMessage,
          category: 'Drop Off',
          data: [make, model, badge, description, rego, currentLocation, nextLocation, notes]
        });
        await manualEntry.save();
        telegramLogger(`- Sent to manual verification`, 'action');

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
          telegramLogger(`- Created drop off task with car details`, 'action');
        } catch (e) {
          telegramLogger(`- Error creating task for Drop Off: ${e.message}`, 'action');
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
        telegramLogger(`- Added to Plan tab for approval (Drop Off converted to Location Update)`, 'action');
      } else {
        try {
          // Append the new destination to the existing next list
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
          } else {
            await Car.findByIdAndUpdate(carToUpdate._id, updateData, { new: true });
          }

          telegramLogger(`- Updated car location to ${updateData.location}, next location set to ${updateData.next.map(entry => entry.location).join(', ')}`, 'action');

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
          telegramLogger(`- Created drop off task`, 'action');
        } catch (e) {
          telegramLogger(`- Error updating car for Drop Off: ${e.message}`, 'action');
        }
      }
    } catch (e) {
      telegramLogger(`- Error processing Drop Off entry: ${e.message}`, 'action');
      if (e.name === 'ValidationError') {
        telegramLogger(`- Validation error details: ${JSON.stringify(e.errors)}`, 'action');
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

      telegramLogger(
        `- Customer Appointment: [${[make, model, badge, description, rego, customerName, day, time, notes, delivery]
          .map(item => item || '')
          .join(', ')}]`,
        'category'
      );

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
          telegramLogger(`- Sent to manual verification due to car stage "${carStage}"`, 'action');
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
      } else if (rego) {
        telegramLogger(`- Car with rego ${rego} not found, creating new car`, 'action');
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
        telegramLogger(`- Created new car: ${newCar.make} ${newCar.model} ${newCar.rego}`, 'action');
        carDetails = {
          id: newCar._id,
          make: newCar.make,
          model: newCar.model,
          badge: newCar.badge,
          description: newCar.description,
          rego: newCar.rego
        };
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
        telegramLogger(carDetails.id ? `- Added customer appointment` : `- Added customer appointment with car details`, 'action');
      } catch (e) {
        telegramLogger(carDetails.id ? `- Error saving customer appointment: ${e.message}` : `- Error saving customer appointment with car details: ${e.message}`, 'action');
      }
    } catch (e) {
      telegramLogger(`- Error processing Customer Appointment entry: ${e.message}`, 'action');
      if (e.name === 'ValidationError') {
        telegramLogger(`- Validation error details: ${JSON.stringify(e.errors)}`, 'action');
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

      telegramLogger(
        `- Reconditioning Appointment: [${[make, model, badge, description, rego, reconditionerName, day, time, notes]
          .map(item => item || '')
          .join(', ')}]`,
        'category'
      );

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
        telegramLogger(`- Car found: ${result.car.make} ${result.car.model} ${result.car.rego}`, 'action');
      } else if (rego) {
        telegramLogger(`- Car with rego ${rego} not found, creating new car`, 'action');
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
        telegramLogger(`- Created new car: ${newCar.make} ${newCar.model} ${newCar.rego}`, 'action');
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
        telegramLogger(`- Added reconditioning appointment`, 'action');
      } catch (e) {
        telegramLogger(`- Error saving reconditioning appointment: ${e.message}`, 'action');
      }
    } catch (e) {
      telegramLogger(`- Error processing Reconditioning Appointment entry: ${e.message}`, 'action');
      if (e.name === 'ValidationError') {
        telegramLogger(`- Validation error details: ${JSON.stringify(e.errors)}`, 'action');
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

      telegramLogger(
        `- Car Repairs: [${[make, model, badge, description, rego, repairTask, notes]
          .map(item => item || '')
          .join(', ')}]`,
        'category'
      );

      const cleanedMessage = entry.message.replace(/^-+\s*/, '').trim();
      if (!cleanedMessage) {
        throw new Error('Message is empty after cleaning');
      }

      const result = await identifyUniqueCar(make, model, badge, rego, description, null, entry.fromPhoto);

      let carToUpdate;
      if (result.status === 'found') {
        carToUpdate = result.car;
        telegramLogger(`- Car found: ${carToUpdate.make} ${carToUpdate.model} ${carToUpdate.rego}`, 'action');
        telegramLogger(`- Current checklist: ${JSON.stringify(carToUpdate.checklist)}`, 'debug');
      } else if (rego) {
        telegramLogger(`- Car with rego ${rego} not found, creating new car`, 'action');
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
        telegramLogger(`- Created new car: ${newCar.make} ${newCar.model} ${newCar.rego}`, 'action');
      } else {
        const manualEntry = new ManualVerification({
          message: cleanedMessage,
          category: 'Car Repairs',
          data: [make, model, badge, description, rego, repairTask, notes]
        });
        await manualEntry.save();
        telegramLogger(`- Sent to manual verification`, 'action');
        continue;
      }

      try {
        const updateData = {
          checklist: repairTask ? [...carToUpdate.checklist, repairTask] : carToUpdate.checklist,
          description: description || carToUpdate.description,
          notes: notes ? (carToUpdate.notes ? `${carToUpdate.notes}; ${notes}` : notes) : carToUpdate.notes,
        };
        telegramLogger(`- Attempting to update with checklist: ${JSON.stringify(updateData.checklist)}`, 'debug');

        const updatedCar = await Car.findByIdAndUpdate(carToUpdate._id, updateData, { new: true, runValidators: true });

        if (!updatedCar) {
          telegramLogger(`- Failed to update car: Document not found`, 'error');
          continue;
        }

        if (repairTask && updatedCar.checklist.includes(repairTask)) {
          telegramLogger(`- Successfully updated car checklist with repair task`, 'action');
        } else if (repairTask) {
          telegramLogger(`- Failed to update car checklist: Repair task "${repairTask}" not added`, 'error');
          telegramLogger(`- Updated checklist: ${JSON.stringify(updatedCar.checklist)}`, 'debug');
        } else {
          telegramLogger(`- No repair task to add, checklist unchanged`, 'action');
        }
      } catch (e) {
        telegramLogger(`- Error updating car for Car Repairs: ${e.message}`, 'error');
        if (e.name === 'ValidationError') {
          telegramLogger(`- Validation error details: ${JSON.stringify(e.errors)}`, 'error');
        }
      }
    } catch (e) {
      telegramLogger(`- Error processing Car Repairs entry: ${e.message}`, 'error');
      if (e.name === 'ValidationError') {
        telegramLogger(`- Validation error details: ${JSON.stringify(e.errors)}`, 'error');
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

      telegramLogger(
        `- Location Update: [${[make, model, badge, description, rego, oldLocation, newLocation, notes]
          .map(item => item || '')
          .join(', ')}]`,
        'category'
      );

      const cleanedMessage = entry.message.replace(/^-+\s*/, '').trim();
      if (!cleanedMessage) {
        throw new Error('Message is empty after cleaning');
      }

      const result = await identifyUniqueCar(make, model, badge, rego, description, oldLocation, entry.fromPhoto);

      let carToUpdate;
      if (result.status === 'found') {
        carToUpdate = result.car;
        telegramLogger(`- Car found: ${carToUpdate.make} ${carToUpdate.model} ${carToUpdate.rego}`, 'action');
      } else if (rego) {
        telegramLogger(`- Car with rego ${rego} not found, creating new car`, 'action');
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
        telegramLogger(`- Created new car: ${newCar.make} ${newCar.model} ${newCar.rego}`, 'action');
      } else if (isPlan) {
        const plans = readPlans();
        const planId = Date.now() + Math.random().toString(36).substr(2, 9);
        const planEntry = {
          id: planId,
          message: cleanedMessage,
          category: 'Location Update',
          data: entry.data,
          fromPhoto: entry.fromPhoto,
          identifiedCar: null,
          status: 'pending',
        };
        plans.push(planEntry);
        writePlans(plans);
        telegramLogger(`- Added to Plan tab for approval (car not identified)`, 'action');
        continue;
      } else {
        const manualEntry = new ManualVerification({
          message: cleanedMessage,
          category: 'Location Update',
          data: [make, model, badge, description, rego, oldLocation, newLocation, notes]
        });
        await manualEntry.save();
        telegramLogger(`- Sent to manual verification`, 'action');

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
          telegramLogger(`- Created location update note with car details`, 'action');
        } catch (e) {
          telegramLogger(`- Error creating note for Location Update: ${e.message}`, 'action');
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
          data: entry.data,
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
        telegramLogger(`- Added to Plan tab for approval`, 'action');
      } else {
        try {
          // Remove any next destination that matches the new location
          const updatedNext = (carToUpdate.next || []).filter(
            entry => entry.location !== newLocation
          );

          const updateData = {
            next: updatedNext,
            description: description || carToUpdate.description,
            notes: notes ? (carToUpdate.notes ? `${carToUpdate.notes}; ${notes}` : notes) : carToUpdate.notes,
          };

          // Schedule the delayed location update
          if (newLocation && newLocation !== carToUpdate.location) {
            const historyUpdated = await updateCarHistory(carToUpdate._id, newLocation, cleanedMessage);
            if (!historyUpdated) {
              throw new Error('Failed to schedule history update');
            }
          }

          // Apply other updates immediately
          await Car.findByIdAndUpdate(carToUpdate._id, updateData, { new: true });

          telegramLogger(`- Scheduled location update to ${newLocation}, next locations: ${updateData.next.map(entry => entry.location).join(', ')}`, 'action');

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
          telegramLogger(`- Created location update note`, 'action');
        } catch (e) {
          telegramLogger(`- Error updating car for Location Update: ${e.message}`, 'action');
        }
      }
    } catch (e) {
      telegramLogger(`- Error processing Location Update entry: ${e.message}`, 'action');
      if (e.name === 'ValidationError') {
        telegramLogger(`- Validation error details: ${JSON.stringify(e.errors)}`, 'action');
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

      telegramLogger(
        `- To Do: [${[make, model, badge, description, rego, task]
          .map(item => item || '')
          .join(', ')}]`,
        'category'
      );

      const cleanedMessage = entry.message.replace(/^-+\s*/, '').trim();
      if (!cleanedMessage) {
        throw new Error('Message is empty after cleaning');
      }

      if (make) {
        const result = await identifyUniqueCar(make, model, badge, rego, description, null, entry.fromPhoto);
        let carToUpdate;
        if (result.status === 'found') {
          carToUpdate = result.car;
          telegramLogger(`- Car found: ${carToUpdate.make} ${carToUpdate.model} ${carToUpdate.rego}`, 'action');
        } else if (rego) {
          telegramLogger(`- Car with rego ${rego} not found, creating new car`, 'action');
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
          telegramLogger(`- Created new car: ${newCar.make} ${newCar.model} ${newCar.rego}`, 'action');
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
            telegramLogger(`- Created to do task with car details`, 'action');
          } catch (e) {
            telegramLogger(`- Error creating to do task with car details: ${e.message}`, 'action');
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
          telegramLogger(`- Created to do task`, 'action');
        } catch (e) {
          telegramLogger(`- Error processing To Do for car: ${e.message}`, 'action');
        }
      } else {
        try {
          const taskEntry = new Task({
            name: cleanedMessage,
            dayTime: new Date().toLocaleDateString(),
            carItems: []
          });
          await taskEntry.save();
          telegramLogger(`- Created to do task without car`, 'action');
        } catch (e) {
          telegramLogger(`- Error creating to do task without car: ${e.message}`, 'action');
        }
      }
    } catch (e) {
      telegramLogger(`- Error processing To Do entry: ${e.message}`, 'action');
      if (e.name === 'ValidationError') {
        telegramLogger(`- Validation error details: ${JSON.stringify(e.errors)}`, 'action');
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

      telegramLogger(
        `- Notes: [${[make, model, badge, description, rego, notes]
          .map(item => item || '')
          .join(', ')}]`,
        'category'
      );

      const cleanedMessage = entry.message.replace(/^-+\s*/, '').trim();
      if (!cleanedMessage) {
        throw new Error('Message is empty after cleaning');
      }

      if (make) {
        const result = await identifyUniqueCar(make, model, badge, rego, description, null, entry.fromPhoto);
        let carToUpdate;
        if (result.status === 'found') {
          carToUpdate = result.car;
          telegramLogger(`- Car found: ${carToUpdate.make} ${carToUpdate.model} ${carToUpdate.rego}`, 'action');
        } else if (rego) {
          telegramLogger(`- Car with rego ${rego} not found, creating new car`, 'action');
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
          telegramLogger(`- Created new car: ${newCar.make} ${newCar.model} ${newCar.rego}`, 'action');
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
            telegramLogger(`- Created note with car details`, 'action');
          } catch (e) {
            telegramLogger(`- Error creating note with car details: ${e.message}`, 'action');
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
          telegramLogger(`- Created note`, 'action');
        } catch (e) {
          telegramLogger(`- Error creating note for car: ${e.message}`, 'action');
        }
      } else {
        try {
          const noteEntry = new Note({
            message: cleanedMessage,
            carItems: []
          });
          await noteEntry.save();
          telegramLogger(`- Created note without car`, 'action');
        } catch (e) {
          telegramLogger(`- Error creating note without car: ${e.message}`, 'action');
        }
      }
    } catch (e) {
      telegramLogger(`- Error processing Notes entry: ${e.message}`, 'action');
      if (e.name === 'ValidationError') {
        telegramLogger(`- Validation error details: ${JSON.stringify(e.errors)}`, 'action');
      }
    }
  }
};

module.exports = { updateDatabaseFromPipeline };