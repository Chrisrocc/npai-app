const axios = require('axios');

// Lists for realistic data generation (Australian context)
const makes = [
  'Toyota', 'Ford', 'Holden', 'Mitsubishi', 'Volkswagen', 'BMW', 'Mercedes-Benz',
  'Honda', 'Mazda', 'Subaru', 'Hyundai', 'Kia', 'Nissan', 'Isuzu', 'Jeep'
];

const models = {
  Toyota: ['Corolla', 'Camry', 'Hilux', 'LandCruiser', 'RAV4', 'Prado'],
  Ford: ['Ranger', 'Falcon', 'Mustang', 'Focus', 'Escape'],
  Holden: ['Commodore', 'Colorado', 'Captiva', 'Cruze'],
  Mitsubishi: ['Triton', 'Pajero', 'Outlander', 'ASX'],
  Volkswagen: ['Golf', 'Passat', 'Tiguan', 'Polo'],
  BMW: ['X5', '3 Series', '5 Series', 'X3'],
  'Mercedes-Benz': ['C-Class', 'E-Class', 'GLC', 'A-Class'],
  Honda: ['Civic', 'Accord', 'CR-V', 'Jazz'],
  Mazda: ['CX-5', 'Mazda3', 'BT-50', 'CX-9'],
  Subaru: ['Forester', 'Outback', 'Impreza', 'WRX'],
  Hyundai: ['Tucson', 'Santa Fe', 'i30', 'Kona'],
  Kia: ['Sportage', 'Cerato', 'Sorento', 'Rio'],
  Nissan: ['Navara', 'Patrol', 'Qashqai', 'X-Trail'],
  Isuzu: ['D-MAX', 'MU-X'],
  Jeep: ['Wrangler', 'Cherokee', 'Grand Cherokee']
};

const badges = ['SR5', 'XR6', 'GTI', 'RS', 'GLX', 'ST', 'Limited', 'Sport', 'Platinum', 'S', 'SE', ''];
const colors = ['Blue', 'Red', 'White', 'Black', 'Silver', 'Grey', 'Green'];
const features = ['canopy', 'bullbar', 'roof racks', 'tow bar', '', ''];
const locations = ['Al\'s', 'Haytham\'s', 'Melbourne', 'Sydney', 'Brisbane', 'Perth', 'Adelaide', 'Imad\'s', 'Capital', 'Unique'];
const statuses = ['In Works', 'Ready', 'Awaiting Parts', 'Inspection', 'Delivered'];
const nextSteps = ['Inspection', 'Delivery', 'Repairs', 'Detailing', ''];
const checklistItems = ['Fix brakes', 'Replace tires', 'Oil change', 'Check engine', 'Clean interior', 'Paint touch-up', ''];
const notesOptions = ['Needs urgent repair', 'Customer requested quick turnaround', 'Awaiting parts delivery', 'Minor scratches noted', ''];

// Store used regos to ensure uniqueness
const usedRegos = new Set();

// Function to generate a unique Australian rego (e.g., ABC123)
const generateUniqueRego = async () => {
  let rego;
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const numbers = '0123456789';
  const maxAttempts = 10;
  let attempts = 0;

  while (attempts < maxAttempts) {
    rego = '';
    for (let i = 0; i < 3; i++) rego += letters.charAt(Math.floor(Math.random() * letters.length));
    for (let i = 0; i < 3; i++) rego += numbers.charAt(Math.floor(Math.random() * numbers.length));

    if (!usedRegos.has(rego)) {
      try {
        const response = await axios.get(`http://localhost:5000/api/cars/rego/${rego}`);
        if (response.data.exists) {
          attempts++;
          continue;
        }
      } catch (err) {
        if (err.response && err.response.status === 404) {
          usedRegos.add(rego);
          return rego;
        }
        console.error(`Error checking rego ${rego}:`, err.message);
        attempts++;
        continue;
      }

      usedRegos.add(rego);
      return rego;
    }
    attempts++;
  }

  throw new Error('Unable to generate a unique rego after maximum attempts');
};

// Function to generate a random car
const generateRandomCar = async () => {
  const make = makes[Math.floor(Math.random() * makes.length)];
  const model = models[make][Math.floor(Math.random() * models[make].length)];
  const badge = badges[Math.floor(Math.random() * badges.length)];
  const rego = await generateUniqueRego();
  const year = Math.floor(Math.random() * (2025 - 2000 + 1)) + 2000;
  const color = colors[Math.floor(Math.random() * colors.length)];
  const feature = features[Math.floor(Math.random() * features.length)];
  const description = feature ? `${color} ${feature}` : color;
  const location = locations[Math.floor(Math.random() * locations.length)];
  const status = statuses[Math.floor(Math.random() * statuses.length)];
  const next = nextSteps[Math.floor(Math.random() * nextSteps.length)];
  
  const checklistLength = Math.floor(Math.random() * 3) + 1;
  const checklistSet = new Set();
  while (checklistSet.size < checklistLength) {
    const item = checklistItems[Math.floor(Math.random() * checklistItems.length)];
    if (item) checklistSet.add(item);
  }
  const checklist = Array.from(checklistSet);

  const notes = notesOptions[Math.floor(Math.random() * notesOptions.length)];
  
  const photos = [`https://example.com/cars/${rego}-1.jpg`, `https://example.com/cars/${rego}-2.jpg`];

  // Generate history as an array of sub-documents
  const history = [
    {
      location,
      dateAdded: new Date().toISOString(),
      dateLeft: null
    }
  ];

  return {
    make,
    model,
    badge,
    rego,
    year,
    description,
    location,
    status,
    next,
    checklist,
    notes,
    photos,
    history
  };
};

// Function to add cars to the database
const addRandomCars = async () => {
  const totalCars = 60;
  console.log(`Adding ${totalCars} random cars to the database...`);

  for (let i = 0; i < totalCars; i++) {
    const carData = await generateRandomCar();
    console.log(`Adding car ${i + 1}/${totalCars}:`, carData);

    try {
      const data = new FormData();
      Object.keys(carData).forEach((key) => {
        if (key === 'photos') {
          carData.photos.forEach((photoUrl, index) => {
            data.append('photos', photoUrl);
          });
        } else if (key === 'history') {
          carData.history.forEach((historyEntry, index) => {
            data.append(`history[${index}][location]`, historyEntry.location);
            data.append(`history[${index}][dateAdded]`, historyEntry.dateAdded);
            if (historyEntry.dateLeft) {
              data.append(`history[${index}][dateLeft]`, historyEntry.dateLeft);
            }
          });
        } else if (key === 'checklist') {
          carData.checklist.forEach((item, index) => {
            data.append(`checklist[${index}]`, item);
          });
        } else {
          data.append(key, carData[key]);
        }
      });

      const response = await axios.post('http://localhost:5000/api/cars', data, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      console.log(`Successfully added car ${i + 1}: ${carData.make} ${carData.model} (rego: ${carData.rego})`);
    } catch (err) {
      console.error(`Error adding car ${i + 1}: ${err.message}`);
      if (err.response) {
        console.error('Backend response:', err.response.data);
      }
    }

    await new Promise(resolve => setTimeout(resolve, 100));
  }

  console.log('Finished adding cars.');
};

// Run the script
addRandomCars().catch(err => {
  console.error('Script error:', err);
  process.exit(1);
});