const Car = require('../models/Cars');
const chalk = require('chalk');
const telegramLogger = require('../telegramLogger');

// Normalize strings
const normalizeString = (str) => {
  if (!str) return '';
  return str.toLowerCase().replace(/[^a-z0-9]/g, '');
};

// Identify a unique car
const identifyUniqueCar = async (make, model, badge, rego, description, location, isGeminiRego = false) => {
  const normalizedMake = normalizeString(make);
  const normalizedModel = normalizeString(model);
  const normalizedBadge = normalizeString(badge);
  const normalizedRego = normalizeString(rego);
  const normalizedDescription = description ? description.toLowerCase().split(' ').filter(kw => kw).map(normalizeString) : [];
  const normalizedLocation = normalizeString(location);

  // Step 1: Check by rego
  if (normalizedRego) {
    const query = { rego: { $regex: new RegExp(`^${normalizedRego}$`, 'i') } };
    const carsWithRego = await Car.find(query);

    if (carsWithRego.length === 1) {
      const car = carsWithRego[0];
      telegramLogger(`- ${car.make} ${car.model} ${car.badge || ''} ${car.rego} ${car.description || ''} Location = ${car.location} identified at stage 1 (rego match)`, 'identification');
      return { car, status: 'found' };
    }
    if (carsWithRego.length > 1) {
      telegramLogger(`- Car not identified - multiple cars with rego ${normalizedRego} at stage 1`, 'identification');
      return { car: null, status: 'multiple_found' };
    }
    if (!isGeminiRego) {
      telegramLogger(`- Car not identified - rego ${normalizedRego} does not match at stage 1`, 'identification');
      return { car: null, status: 'not_found' };
    }
  }

  // Step 2: Check by make
  if (normalizedMake) {
    const query = { make: { $regex: new RegExp(`^${normalizedMake}$`, 'i') } };
    const carsWithMake = await Car.find(query);

    if (carsWithMake.length === 1) {
      const car = carsWithMake[0];
      telegramLogger(`- ${car.make} ${car.model} ${car.badge || ''} ${car.rego} ${car.description || ''} Location = ${car.location} identified at stage 2 (make match)`, 'identification');
      return { car, status: 'found' };
    }
    if (carsWithMake.length === 0) {
      telegramLogger(`- Car not identified - no cars found with make ${normalizedMake} at stage 2`, 'identification');
      return { car: null, status: 'not_found' };
    }
  }

  // Step 3: Check by make + model, then by description if multiple matches
  if (normalizedMake && normalizedModel) {
    const query = {
      make: { $regex: new RegExp(`^${normalizedMake}$`, 'i') },
      model: { $regex: new RegExp(`^${normalizedModel}$`, 'i') }
    };
    const carsWithMakeAndModel = await Car.find(query);

    if (carsWithMakeAndModel.length === 1) {
      const car = carsWithMakeAndModel[0];
      telegramLogger(`- ${car.make} ${car.model} ${car.badge || ''} ${car.rego} ${car.description || ''} Location = ${car.location} identified at stage 3 (make and model match)`, 'identification');
      return { car, status: 'found' };
    }
    if (carsWithMakeAndModel.length === 0) {
      telegramLogger(`- Car not identified - no cars found with make ${normalizedMake} and model ${normalizedModel} at stage 3`, 'identification');
      return { car: null, status: 'not_found' };
    }
    if (carsWithMakeAndModel.length > 1) {
      // Multiple cars match by make and model, try to narrow down by description
      if (normalizedDescription.length > 0) {
        const descriptionConditions = normalizedDescription.map(keyword => ({
          description: { $regex: new RegExp(`^${keyword}$`, 'i') }
        }));
        const queryWithDescription = {
          make: { $regex: new RegExp(`^${normalizedMake}$`, 'i') },
          model: { $regex: new RegExp(`^${normalizedModel}$`, 'i') },
          $or: descriptionConditions
        };
        const carsWithDescription = await Car.find(queryWithDescription);

        if (carsWithDescription.length === 1) {
          const car = carsWithDescription[0];
          telegramLogger(`- ${car.make} ${car.model} ${car.badge || ''} ${car.rego} ${car.description || ''} Location = ${car.location} identified at stage 3 (description match)`, 'identification');
          return { car, status: 'found' };
        }
      }
      telegramLogger(`- Car not identified - multiple model type ${normalizedModel}s at stage 3`, 'identification');
      return { car: null, status: 'multiple_found' };
    }
  } else if (normalizedModel) {
    const query = { model: { $regex: new RegExp(`^${normalizedModel}$`, 'i') } };
    const carsWithModel = await Car.find(query);

    if (carsWithModel.length === 1) {
      const car = carsWithModel[0];
      telegramLogger(`- ${car.make} ${car.model} ${car.badge || ''} ${car.rego} ${car.description || ''} Location = ${car.location} identified at stage 3 (model match)`, 'identification');
      return { car, status: 'found' };
    }
    if (carsWithModel.length > 1) {
      if (normalizedDescription.length > 0) {
        const descriptionConditions = normalizedDescription.map(keyword => ({
          description: { $regex: new RegExp(`^${keyword}$`, 'i') }
        }));
        const queryWithDescription = {
          model: { $regex: new RegExp(`^${normalizedModel}$`, 'i') },
          $or: descriptionConditions
        };
        const carsWithDescription = await Car.find(queryWithDescription);

        if (carsWithDescription.length === 1) {
          const car = carsWithDescription[0];
          telegramLogger(`- ${car.make} ${car.model} ${car.badge || ''} ${car.rego} ${car.description || ''} Location = ${car.location} identified at stage 3 (description match)`, 'identification');
          return { car, status: 'found' };
        }
      }
      telegramLogger(`- Car not identified - multiple model type ${normalizedModel}s at stage 3`, 'identification');
      return { car: null, status: 'multiple_found' };
    }
  } else if (normalizedMake && normalizedBadge) {
    const query = {
      make: { $regex: new RegExp(`^${normalizedMake}$`, 'i') },
      badge: { $regex: new RegExp(`^${normalizedBadge}$`, 'i') }
    };
    const carsWithMakeAndBadge = await Car.find(query);

    if (carsWithMakeAndBadge.length === 1) {
      const car = carsWithMakeAndBadge[0];
      telegramLogger(`- ${car.make} ${car.model} ${car.badge || ''} ${car.rego} ${car.description || ''} Location = ${car.location} identified at stage 3.5 (make and badge match)`, 'identification');
      return { car, status: 'found' };
    }
    if (carsWithMakeAndBadge.length === 0) {
      telegramLogger(`- Car not identified - no cars found with make ${normalizedMake} and badge ${normalizedBadge} at stage 3.5`, 'identification');
      return { car: null, status: 'not_found' };
    } else {
      if (normalizedDescription.length > 0) {
        const descriptionConditions = normalizedDescription.map(keyword => ({
          description: { $regex: new RegExp(`^${keyword}$`, 'i') }
        }));
        const queryWithDescription = {
          make: { $regex: new RegExp(`^${normalizedMake}$`, 'i') },
          badge: { $regex: new RegExp(`^${normalizedBadge}$`, 'i') },
          $or: descriptionConditions
        };
        const carsWithDescription = await Car.find(queryWithDescription);

        if (carsWithDescription.length === 1) {
          const car = carsWithDescription[0];
          telegramLogger(`- ${car.make} ${car.model} ${car.badge || ''} ${car.rego} ${car.description || ''} Location = ${car.location} identified at stage 3.5 (description match)`, 'identification');
          return { car, status: 'found' };
        }
      }
      telegramLogger(`- Car not identified - multiple cars with make ${normalizedMake} and badge ${normalizedBadge} at stage 3.5`, 'identification');
      return { car: null, status: 'multiple_found' };
    }
  }

  // Step 4: Check by make + model + badge
  if (normalizedMake && normalizedModel && normalizedBadge) {
    const query = {
      make: { $regex: new RegExp(`^${normalizedMake}$`, 'i') },
      model: { $regex: new RegExp(`^${normalizedModel}$`, 'i') },
      badge: { $regex: new RegExp(`^${normalizedBadge}$`, 'i') }
    };
    const carsWithMakeModelBadge = await Car.find(query);

    if (carsWithMakeModelBadge.length === 1) {
      const car = carsWithMakeModelBadge[0];
      telegramLogger(`- ${car.make} ${car.model} ${car.badge || ''} ${car.rego} ${car.description || ''} Location = ${car.location} identified at stage 4 (make, model, and badge match)`, 'identification');
      return { car, status: 'found' };
    }
    if (carsWithMakeModelBadge.length > 1) {
      if (normalizedDescription.length > 0) {
        const descriptionConditions = normalizedDescription.map(keyword => ({
          description: { $regex: new RegExp(`^${keyword}$`, 'i') }
        }));
        const queryWithDescription = {
          make: { $regex: new RegExp(`^${normalizedMake}$`, 'i') },
          model: { $regex: new RegExp(`^${normalizedModel}$`, 'i') },
          badge: { $regex: new RegExp(`^${normalizedBadge}$`, 'i') },
          $or: descriptionConditions
        };
        const carsWithDescription = await Car.find(queryWithDescription);

        if (carsWithDescription.length === 1) {
          const car = carsWithDescription[0];
          telegramLogger(`- ${car.make} ${car.model} ${car.badge || ''} ${car.rego} ${car.description || ''} Location = ${car.location} identified at stage 4 (description match)`, 'identification');
          return { car, status: 'found' };
        }
      }
      telegramLogger(`- Car not identified - multiple cars with make ${normalizedMake}, model ${normalizedModel}, badge ${normalizedBadge} at stage 4`, 'identification');
      return { car: null, status: 'multiple_found' };
    }
  }

  // Step 5: Check by make + model (if mentioned) + badge (if mentioned) + description
  let queryConditions = {};
  if (normalizedMake) {
    queryConditions.make = { $regex: new RegExp(`^${normalizedMake}$`, 'i') };
  }
  if (normalizedModel) {
    queryConditions.model = { $regex: new RegExp(`^${normalizedModel}$`, 'i') };
  }
  if (normalizedBadge) {
    queryConditions.badge = { $regex: new RegExp(`^${normalizedBadge}$`, 'i') };
  }

  let carsMatchingBase = await Car.find(Object.keys(queryConditions).length > 0 ? queryConditions : {});

  if (normalizedDescription.length > 0) {
    const descriptionConditions = normalizedDescription.map(keyword => ({
      description: { $regex: new RegExp(`^${keyword}$`, 'i') }
    }));
    const queryWithDescription = {
      ...queryConditions,
      $or: descriptionConditions
    };
    const carsWithDescription = await Car.find(queryWithDescription);

    if (carsWithDescription.length === 1) {
      const car = carsWithDescription[0];
      telegramLogger(`- ${car.make} ${car.model} ${car.badge || ''} ${car.rego} ${car.description || ''} Location = ${car.location} identified at stage 5 (base + description match)`, 'identification');
      return { car, status: 'found' };
    }
    if (carsWithDescription.length > 1) {
      telegramLogger(`- Car not identified - multiple cars with specified base and description at stage 5`, 'identification');
      return { car: null, status: 'multiple_found' };
    }
    const hasBlankDescription = carsMatchingBase.every(car => !car.description || normalizeString(car.description) === '');
    if (!hasBlankDescription) {
      telegramLogger(`- Car not identified - no cars found with specified base and description at stage 5`, 'identification');
      return { car: null, status: 'not_found' };
    }
  }

  // Step 6: Check by make + model (if mentioned) + badge (if mentioned) + description (if mentioned) + location
  if (normalizedLocation) {
    let locationQuery = { ...queryConditions };
    if (normalizedDescription.length > 0) {
      const descriptionConditions = normalizedDescription.map(keyword => ({
        description: { $regex: new RegExp(`^${keyword}$`, 'i') }
      }));
      locationQuery.$or = descriptionConditions;
    }
    locationQuery.location = { $regex: new RegExp(`^${normalizedLocation}$`, 'i') };

    let carsWithLocation = await Car.find(locationQuery);

    if (carsWithLocation.length === 1) {
      const car = carsWithLocation[0];
      telegramLogger(`- ${car.make} ${car.model} ${car.badge || ''} ${car.rego} ${car.description || ''} Location = ${car.location} identified at stage 6 (full conditions match)`, 'identification');
      return { car, status: 'found' };
    }
    if (carsWithLocation.length > 1) {
      telegramLogger(`- Car not identified - multiple cars with specified conditions at stage 6`, 'identification');
      return { car: null, status: 'multiple_found' };
    }

    if (normalizedDescription.length > 0) {
      delete locationQuery.$or;
      carsWithLocation = await Car.find(locationQuery);

      if (carsWithLocation.length === 1) {
        const car = carsWithLocation[0];
        telegramLogger(`- ${car.make} ${car.model} ${car.badge || ''} ${car.rego} ${car.description || ''} Location = ${car.location} identified at stage 6 (without description match)`, 'identification');
        return { car, status: 'found' };
      }
      if (carsWithLocation.length > 1) {
        telegramLogger(`- Car not identified - multiple cars without description at stage 6`, 'identification');
        return { car: null, status: 'multiple_found' };
      }
    }

    if (normalizedBadge) {
      delete locationQuery.badge;
      if (normalizedDescription.length > 0) {
        const descriptionConditions = normalizedDescription.map(keyword => ({
          description: { $regex: new RegExp(`^${keyword}$`, 'i') }
        }));
        locationQuery.$or = descriptionConditions;
      }
      carsWithLocation = await Car.find(locationQuery);

      if (carsWithLocation.length === 1) {
        const car = carsWithLocation[0];
        telegramLogger(`- ${car.make} ${car.model} ${car.badge || ''} ${car.rego} ${car.description || ''} Location = ${car.location} identified at stage 6 (without badge match)`, 'identification');
        return { car, status: 'found' };
      }
      if (carsWithLocation.length > 1) {
        telegramLogger(`- Car not identified - multiple cars without badge at stage 6`, 'identification');
        return { car: null, status: 'multiple_found' };
      }

      if (normalizedDescription.length > 0) {
        delete locationQuery.$or;
        carsWithLocation = await Car.find(locationQuery);

        if (carsWithLocation.length === 1) {
          const car = carsWithLocation[0];
          telegramLogger(`- ${car.make} ${car.model} ${car.badge || ''} ${car.rego} ${car.description || ''} Location = ${car.location} identified at stage 6 (without description and badge match)`, 'identification');
          return { car, status: 'found' };
        }
        if (carsWithLocation.length > 1) {
          telegramLogger(`- Car not identified - multiple cars without description and badge at stage 6`, 'identification');
          return { car: null, status: 'multiple_found' };
        }
      }
    }

    if (normalizedModel) {
      delete locationQuery.model;
      if (normalizedDescription.length > 0) {
        const descriptionConditions = normalizedDescription.map(keyword => ({
          description: { $regex: new RegExp(`^${keyword}$`, 'i') }
        }));
        locationQuery.$or = descriptionConditions;
      }
      carsWithLocation = await Car.find(locationQuery);

      if (carsWithLocation.length === 1) {
        const car = carsWithLocation[0];
        telegramLogger(`- ${car.make} ${car.model} ${car.badge || ''} ${car.rego} ${car.description || ''} Location = ${car.location} identified at stage 6 (without model match)`, 'identification');
        return { car, status: 'found' };
      }
      if (carsWithLocation.length > 1) {
        telegramLogger(`- Car not identified - multiple cars without model at stage 6`, 'identification');
        return { car: null, status: 'multiple_found' };
      }

      if (normalizedDescription.length > 0) {
        delete locationQuery.$or;
        carsWithLocation = await Car.find(locationQuery);

        if (carsWithLocation.length === 1) {
          const car = carsWithLocation[0];
          telegramLogger(`- ${car.make} ${car.model} ${car.badge || ''} ${car.rego} ${car.description || ''} Location = ${car.location} identified at stage 6 (without description and model match)`, 'identification');
          return { car, status: 'found' };
        }
        if (carsWithLocation.length > 1) {
          telegramLogger(`- Car not identified - multiple cars without description and model at stage 6`, 'identification');
          return { car: null, status: 'multiple_found' };
        }
      }
    }

    delete locationQuery.make;
    carsWithLocation = await Car.find(locationQuery);

    if (carsWithLocation.length === 1) {
      const car = carsWithLocation[0];
      telegramLogger(`- ${car.make} ${car.model} ${car.badge || ''} ${car.rego} ${car.description || ''} Location = ${car.location} identified at stage 6 (minimal conditions match)`, 'identification');
      return { car, status: 'found' };
    }
    if (carsWithLocation.length > 1) {
      telegramLogger(`- Car not identified - multiple cars with minimal conditions at stage 6`, 'identification');
      return { car: null, status: 'multiple_found' };
    }
  }

  telegramLogger(`- Car not identified - no unique car found after all stages`, 'identification');
  return { car: null, status: 'not_found' };
};

module.exports = { normalizeString, identifyUniqueCar };