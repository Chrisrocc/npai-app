require('dotenv').config();
     const mongoose = require('mongoose');
     const connectDB = require('./config/db');
     const Car = require('./models/Cars');

     async function fixRegos() {
       await connectDB();
       // Fetch all cars and group by current rego to identify duplicates
       const cars = await Car.find({ rego: { $exists: true } }).lean(); // Use lean for read-only efficiency
       const regoMap = new Map();

       // Group cars by rego to find duplicates
       for (const car of cars) {
         if (regoMap.has(car.rego)) {
           regoMap.get(car.rego).push(car._id);
         } else {
           regoMap.set(car.rego, [car._id]);
         }
       }

       // Delete duplicates, keeping the first occurrence
       for (const [rego, ids] of regoMap) {
         if (ids.length > 1) {
           const keepId = ids[0]; // Keep the first car
           for (const id of ids.slice(1)) {
             console.log(`Deleting duplicate car ${id} with rego ${rego}`);
             await Car.findByIdAndDelete(id);
           }
         }
       }

       // Now update regos for remaining cars
       const updatedCars = await Car.find({ rego: { $exists: true } });
       for (const car of updatedCars) {
         const sanitizedRego = car.rego.replace(/[^a-zA-Z0-9]/g, '').slice(0, 6) || 'DEFAULT';
         if (sanitizedRego !== car.rego) {
           car.rego = sanitizedRego;
           await car.save();
           console.log(`Updated rego for car ${car._id}: ${car.rego} (was ${car.rego})`);
         }
       }

       console.log('Rego updates complete');
       mongoose.connection.close();
     }

     fixRegos().catch(console.error);