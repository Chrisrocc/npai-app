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
    const carsWithRego = await Car.find({
      $where: `this.rego.toLowerCase().replace(/[^a-z0-9]/g, '') === "${normalizedRego}"`
    });

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
    const carsWithMake = await Car.find({
      $where: `this.make.toLowerCase().replace(/[^a-z0-9]/g, '') === "${normalizedMake}"`
    });

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
    const carsWithMakeAndModel = await Car.find({
      $where: `this.make.toLowerCase().replace(/[^a-z0-9]/g, '') === "${normalizedMake}" && this.model.toLowerCase().replace(/[^a-z0-9]/g, '') === "${normalizedModel}"`
    });

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
        // Check each description word to see if it uniquely matches one car's description
        for (const keyword of normalizedDescription) {
          const matchingCars = carsWithMakeAndModel.filter(car =>
            car.description && normalizeString(car.description).includes(keyword)
          );

          if (matchingCars.length === 1) {
            const car = matchingCars[0];
            telegramLogger(`- ${car.make} ${car.model} ${car.badge || ''} ${car.rego} ${car.description || ''} Location = ${car.location} identified at stage 3 (description word "${keyword}" uniquely matches)`, 'identification');
            return { car, status: 'found' };
          }
        }
      }
      telegramLogger(`- Car not identified - multiple model type ${normalizedModel}s at stage 3`, 'identification');
      return { car: null, status: 'multiple_found' };
    }
  } else if (normalizedModel) {
    const carsWithModel = await Car.find({
      $where: `this.model.toLowerCase().replace(/[^a-z0-9]/g, '') === "${normalizedModel}"`
    });

    if (carsWithModel.length === 1) {
      const car = carsWithModel[0];
      telegramLogger(`- ${car.make} ${car.model} ${car.badge || ''} ${car.rego} ${car.description || ''} Location = ${car.location} identified at stage 3 (model match)`, 'identification');
      return { car, status: 'found' };
    }
    if (carsWithModel.length > 1) {
      // Multiple cars match by model, try to narrow down by description
      if (normalizedDescription.length > 0) {
        for (const keyword of normalizedDescription) {
          const matchingCars = carsWithModel.filter(car =>
            car.description && normalizeString(car.description).includes(keyword)
          );

          if (matchingCars.length === 1) {
            const car = matchingCars[0];
            telegramLogger(`- ${car.make} ${car.model} ${car.badge || ''} ${car.rego} ${car.description || ''} Location = ${car.location} identified at stage 3 (description word "${keyword}" uniquely matches)`, 'identification');
            return { car, status: 'found' };
          }
        }
      }
      telegramLogger(`- Car not identified - multiple model type ${normalizedModel}s at stage 3`, 'identification');
      return { car: null, status: 'multiple_found' };
    }
  } else if (normalizedMake && normalizedBadge) {
    const carsWithMakeAndBadge = await Car.find({
      $where: `this.make.toLowerCase().replace(/[^a-z0-9]/g, '') === "${normalizedMake}" && this.badge.toLowerCase().replace(/[^a-z0-9]/g, '') === "${normalizedBadge}"`
    });

    if (carsWithMakeAndBadge.length === 1) {
      const car = carsWithMakeAndBadge[0];
      telegramLogger(`- ${car.make} ${car.model} ${car.badge || ''} ${car.rego} ${car.description || ''} Location = ${car.location} identified at stage 3.5 (make and badge match)`, 'identification');
      return { car, status: 'found' };
    }
    if (carsWithMakeAndBadge.length === 0) {
      telegramLogger(`- Car not identified - no cars found with make ${normalizedMake} and badge ${normalizedBadge} at stage 3.5`, 'identification');
      return { car: null, status: 'not_found' };
    } else {
      // Multiple cars match by make and badge, try to narrow down by description
      if (normalizedDescription.length > 0) {
        for (const keyword of normalizedDescription) {
          const matchingCars = carsWithMakeAndBadge.filter(car =>
            car.description && normalizeString(car.description).includes(keyword)
          );

          if (matchingCars.length === 1) {
            const car = matchingCars[0];
            telegramLogger(`- ${car.make} ${car.model} ${car.badge || ''} ${car.rego} ${car.description || ''} Location = ${car.location} identified at stage 3.5 (description word "${keyword}" uniquely matches)`, 'identification');
            return { car, status: 'found' };
          }
        }
      }
      telegramLogger(`- Car not identified - multiple cars with make ${normalizedMake} and badge ${normalizedBadge} at stage 3.5`, 'identification');
      return { car: null, status: 'multiple_found' };
    }
  }

  // Step 4: Check by make + model + badge
  if (normalizedMake && normalizedModel && normalizedBadge) {
    const carsWithMakeModelBadge = await Car.find({
      $where: `this.make.toLowerCase().replace(/[^a-z0-9]/g, '') === "${normalizedMake}" && this.model.toLowerCase().replace(/[^a-z0-9]/g, '') === "${normalizedModel}" && this.badge.toLowerCase().replace(/[^a-z0-9]/g, '') === "${normalizedBadge}"`
    });

    if (carsWithMakeModelBadge.length === 1) {
      const car = carsWithMakeModelBadge[0];
      telegramLogger(`- ${car.make} ${car.model} ${car.badge || ''} ${car.rego} ${car.description || ''} Location = ${car.location} identified at stage 4 (make, model, and badge match)`, 'identification');
      return { car, status: 'found' };
    }
    if (carsWithMakeModelBadge.length > 1) {
      // Multiple cars match by make, model, and badge, try to narrow down by description
      if (normalizedDescription.length > 0) {
        for (const keyword of normalizedDescription) {
          const matchingCars = carsWithMakeModelBadge.filter(car =>
            car.description && normalizeString(car.description).includes(keyword)
          );

          if (matchingCars.length === 1) {
            const car = matchingCars[0];
            telegramLogger(`- ${car.make} ${car.model} ${car.badge || ''} ${car.rego} ${car.description || ''} Location = ${car.location} identified at stage 4 (description word "${keyword}" uniquely matches)`, 'identification');
            return { car, status: 'found' };
          }
        }
      }
      telegramLogger(`- Car not identified - multiple cars with make ${normalizedMake}, model ${normalizedModel}, badge ${normalizedBadge} at stage 4`, 'identification');
      return { car: null, status: 'multiple_found' };
    }
  }

  // Step 5: Check by make + model (if mentioned) + badge (if mentioned) + description
  let allCars = await Car.find({});

  let baseConditions = [];
  if (normalizedMake) baseConditions.push(`this.make.toLowerCase().replace(/[^a-z0-9]/g, '') === "${normalizedMake}"`);
  if (normalizedModel) baseConditions.push(`this.model.toLowerCase().replace(/[^a-z0-9]/g, '') === "${normalizedModel}"`);
  if (normalizedBadge) baseConditions.push(`this.badge.toLowerCase().replace(/[^a-z0-9]/g, '') === "${normalizedBadge}"`);

  let carsMatchingBase = allCars;
  if (baseConditions.length > 0) {
    carsMatchingBase = await Car.find({
      $where: `function() { return ${baseConditions.join(' && ')}; }`
    });
  }

  if (normalizedDescription.length > 0) {
    const descriptionConditions = normalizedDescription.map(keyword => {
      return `this.description.toLowerCase().replace(/[^a-z0-9]/g, '').includes("${keyword}")`;
    }).join(' || ');
    const carsWithDescription = await Car.find({
      $where: `function() { return (${baseConditions.join(' && ')}) && (${descriptionConditions}); }`
    });

    if (carsWithDescription.length === 1) {
      const car = carsWithDescription[0];
      telegramLogger(`- ${car.make} ${car.model} ${car.badge || ''} ${car.rego} ${car.description || ''} Location = ${car.location} identified at stage 5 (base + description match)`, 'identification');
      return { car, status: 'found' };
    }
    if (carsWithDescription.length > 1) {
      // Multiple cars match by base + description, try to narrow down by unique description word
      for (const keyword of normalizedDescription) {
        const matchingCars = carsWithDescription.filter(car =>
          car.description && normalizeString(car.description).includes(keyword)
        );

        if (matchingCars.length === 1) {
          const car = matchingCars[0];
          telegramLogger(`- ${car.make} ${car.model} ${car.badge || ''} ${car.rego} ${car.description || ''} Location = ${car.location} identified at stage 5 (description word "${keyword}" uniquely matches)`, 'identification');
          return { car, status: 'found' };
        }
      }
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
    let locationConditions = [...baseConditions];
    if (normalizedDescription.length > 0) {
      const descriptionConditions = normalizedDescription.map(keyword => {
        return `this.description.toLowerCase().replace(/[^a-z0-9]/g, '').includes("${keyword}")`;
      }).join(' || ');
      locationConditions.push(`(${descriptionConditions})`);
    }
    // Add null check for location to avoid TypeError
    locationConditions.push(`(this.location ? this.location.toLowerCase().replace(/[^a-z0-9]/g, '') : '') === "${normalizedLocation}"`);

    let carsWithLocation = await Car.find({
      $where: `function() { return ${locationConditions.join(' && ')}; }`
    });

    if (carsWithLocation.length === 1) {
      const car = carsWithLocation[0];
      telegramLogger(`- ${car.make} ${car.model} ${car.badge || ''} ${car.rego} ${car.description || ''} Location = ${car.location} identified at stage 6 (full conditions match)`, 'identification');
      return { car, status: 'found' };
    }
    if (carsWithLocation.length > 1) {
      // Multiple cars match by full conditions, try to narrow down by unique description word
      for (const keyword of normalizedDescription) {
        const matchingCars = carsWithLocation.filter(car =>
          car.description && normalizeString(car.description).includes(keyword)
        );

        if (matchingCars.length === 1) {
          const car = matchingCars[0];
          telegramLogger(`- ${car.make} ${car.model} ${car.badge || ''} ${car.rego} ${car.description || ''} Location = ${car.location} identified at stage 6 (description word "${keyword}" uniquely matches)`, 'identification');
          return { car, status: 'found' };
        }
      }
      telegramLogger(`- Car not identified - multiple cars with specified conditions at stage 6`, 'identification');
      return { car: null, status: 'multiple_found' };
    }

    if (normalizedDescription.length > 0) {
      locationConditions = [...baseConditions, `(this.location ? this.location.toLowerCase().replace(/[^a-z0-9]/g, '') : '') === "${normalizedLocation}"`];
      carsWithLocation = await Car.find({
        $where: `function() { return ${locationConditions.join(' && ')}; }`
      });

      if (carsWithLocation.length === 1) {
        const car = carsWithLocation[0];
        telegramLogger(`- ${car.make} ${car.model} ${car.badge || ''} ${car.rego} ${car.description || ''} Location = ${car.location} identified at stage 6 (without description match)`, 'identification');
        return { car, status: 'found' };
      }
      if (carsWithLocation.length > 1) {
        // Multiple cars match without description, try to narrow down by unique description word
        for (const keyword of normalizedDescription) {
          const matchingCars = carsWithLocation.filter(car =>
            car.description && normalizeString(car.description).includes(keyword)
          );

          if (matchingCars.length === 1) {
            const car = matchingCars[0];
            telegramLogger(`- ${car.make} ${car.model} ${car.badge || ''} ${car.rego} ${car.description || ''} Location = ${car.location} identified at stage 6 (description word "${keyword}" uniquely matches without description)`, 'identification');
            return { car, status: 'found' };
          }
        }
        telegramLogger(`- Car not identified - multiple cars without description at stage 6`, 'identification');
        return { car: null, status: 'multiple_found' };
      }
    }

    if (normalizedBadge) {
      locationConditions = [];
      if (normalizedMake) locationConditions.push(`this.make.toLowerCase().replace(/[^a-z0-9]/g, '') === "${normalizedMake}"`);
      if (normalizedModel) locationConditions.push(`this.model.toLowerCase().replace(/[^a-z0-9]/g, '') === "${normalizedModel}"`);
      if (normalizedDescription.length > 0) {
        const descriptionConditions = normalizedDescription.map(keyword => {
          return `this.description.toLowerCase().replace(/[^a-z0-9]/g, '').includes("${keyword}")`;
        }).join(' || ');
        locationConditions.push(`(${descriptionConditions})`);
      }
      locationConditions.push(`(this.location ? this.location.toLowerCase().replace(/[^a-z0-9]/g, '') : '') === "${normalizedLocation}"`);

      carsWithLocation = await Car.find({
        $where: `function() { return ${locationConditions.join(' && ')}; }`
      });

      if (carsWithLocation.length === 1) {
        const car = carsWithLocation[0];
        telegramLogger(`- ${car.make} ${car.model} ${car.badge || ''} ${car.rego} ${car.description || ''} Location = ${car.location} identified at stage 6 (without badge match)`, 'identification');
        return { car, status: 'found' };
      }
      if (carsWithLocation.length > 1) {
        // Multiple cars match without badge, try to narrow down by unique description word
        for (const keyword of normalizedDescription) {
          const matchingCars = carsWithLocation.filter(car =>
            car.description && normalizeString(car.description).includes(keyword)
          );

          if (matchingCars.length === 1) {
            const car = matchingCars[0];
            telegramLogger(`- ${car.make} ${car.model} ${car.badge || ''} ${car.rego} ${car.description || ''} Location = ${car.location} identified at stage 6 (description word "${keyword}" uniquely matches without badge)`, 'identification');
            return { car, status: 'found' };
          }
        }
        telegramLogger(`- Car not identified - multiple cars without badge at stage 6`, 'identification');
        return { car: null, status: 'multiple_found' };
      }

      if (normalizedDescription.length > 0) {
        locationConditions = [];
        if (normalizedMake) locationConditions.push(`this.make.toLowerCase().replace(/[^a-z0-9]/g, '') === "${normalizedMake}"`);
        if (normalizedModel) locationConditions.push(`this.model.toLowerCase().replace(/[^a-z0-9]/g, '') === "${normalizedModel}"`);
        locationConditions.push(`(this.location ? this.location.toLowerCase().replace(/[^a-z0-9]/g, '') : '') === "${normalizedLocation}"`);

        carsWithLocation = await Car.find({
          $where: `function() { return ${locationConditions.join(' && ')}; }`
        });

        if (carsWithLocation.length === 1) {
          const car = carsWithLocation[0];
          telegramLogger(`- ${car.make} ${car.model} ${car.badge || ''} ${car.rego} ${car.description || ''} Location = ${car.location} identified at stage 6 (without description and badge match)`, 'identification');
          return { car, status: 'found' };
        }
        if (carsWithLocation.length > 1) {
          // Multiple cars match without description and badge, try to narrow down by unique description word
          for (const keyword of normalizedDescription) {
            const matchingCars = carsWithLocation.filter(car =>
              car.description && normalizeString(car.description).includes(keyword)
            );

            if (matchingCars.length === 1) {
              const car = matchingCars[0];
              telegramLogger(`- ${car.make} ${car.model} ${car.badge || ''} ${car.rego} ${car.description || ''} Location = ${car.location} identified at stage 6 (description word "${keyword}" uniquely matches without description and badge)`, 'identification');
              return { car, status: 'found' };
            }
          }
          telegramLogger(`- Car not identified - multiple cars without description and badge at stage 6`, 'identification');
          return { car: null, status: 'multiple_found' };
        }
      }
    }

    if (normalizedModel) {
      locationConditions = [];
      if (normalizedMake) locationConditions.push(`this.make.toLowerCase().replace(/[^a-z0-9]/g, '') === "${normalizedMake}"`);
      if (normalizedDescription.length > 0) {
        const descriptionConditions = normalizedDescription.map(keyword => {
          return `this.description.toLowerCase().replace(/[^a-z0-9]/g, '').includes("${keyword}")`;
        }).join(' || ');
        locationConditions.push(`(${descriptionConditions})`);
      }
      locationConditions.push(`(this.location ? this.location.toLowerCase().replace(/[^a-z0-9]/g, '') : '') === "${normalizedLocation}"`);

      carsWithLocation = await Car.find({
        $where: `function() { return ${locationConditions.join(' && ')}; }`
      });

      if (carsWithLocation.length === 1) {
        const car = carsWithLocation[0];
        telegramLogger(`- ${car.make} ${car.model} ${car.badge || ''} ${car.rego} ${car.description || ''} Location = ${car.location} identified at stage 6 (without model match)`, 'identification');
        return { car, status: 'found' };
      }
      if (carsWithLocation.length > 1) {
        // Multiple cars match without model, try to narrow down by unique description word
        for (const keyword of normalizedDescription) {
          const matchingCars = carsWithLocation.filter(car =>
            car.description && normalizeString(car.description).includes(keyword)
          );

          if (matchingCars.length === 1) {
            const car = matchingCars[0];
            telegramLogger(`- ${car.make} ${car.model} ${car.badge || ''} ${car.rego} ${car.description || ''} Location = ${car.location} identified at stage 6 (description word "${keyword}" uniquely matches without model)`, 'identification');
            return { car, status: 'found' };
          }
        }
        telegramLogger(`- Car not identified - multiple cars without model at stage 6`, 'identification');
        return { car: null, status: 'multiple_found' };
      }

      if (normalizedDescription.length > 0) {
        locationConditions = [];
        if (normalizedMake) locationConditions.push(`this.make.toLowerCase().replace(/[^a-z0-9]/g, '') === "${normalizedMake}"`);
        locationConditions.push(`(this.location ? this.location.toLowerCase().replace(/[^a-z0-9]/g, '') : '') === "${normalizedLocation}"`);

        carsWithLocation = await Car.find({
          $where: `function() { return ${locationConditions.join(' && ')}; }`
        });

        if (carsWithLocation.length === 1) {
          const car = carsWithLocation[0];
          telegramLogger(`- ${car.make} ${car.model} ${car.badge || ''} ${car.rego} ${car.description || ''} Location = ${car.location} identified at stage 6 (without description and model match)`, 'identification');
          return { car, status: 'found' };
        }
        if (carsWithLocation.length > 1) {
          // Multiple cars match without description and model, try to narrow down by unique description word
          for (const keyword of normalizedDescription) {
            const matchingCars = carsWithLocation.filter(car =>
              car.description && normalizeString(car.description).includes(keyword)
            );

            if (matchingCars.length === 1) {
              const car = matchingCars[0];
              telegramLogger(`- ${car.make} ${car.model} ${car.badge || ''} ${car.rego} ${car.description || ''} Location = ${car.location} identified at stage 6 (description word "${keyword}" uniquely matches without description and model)`, 'identification');
              return { car, status: 'found' };
            }
          }
          telegramLogger(`- Car not identified - multiple cars without description and model at stage 6`, 'identification');
          return { car: null, status: 'multiple_found' };
        }
      }
    }

    locationConditions = [];
    if (normalizedMake) locationConditions.push(`this.make.toLowerCase().replace(/[^a-z0-9]/g, '') === "${normalizedMake}"`);
    locationConditions.push(`(this.location ? this.location.toLowerCase().replace(/[^a-z0-9]/g, '') : '') === "${normalizedLocation}"`);

    carsWithLocation = await Car.find({
      $where: `function() { return ${locationConditions.join(' && ')}; }`
    });

    if (carsWithLocation.length === 1) {
      const car = carsWithLocation[0];
      telegramLogger(`- ${car.make} ${car.model} ${car.badge || ''} ${car.rego} ${car.description || ''} Location = ${car.location} identified at stage 6 (minimal conditions match)`, 'identification');
      return { car, status: 'found' };
    }
    if (carsWithLocation.length > 1) {
      // Multiple cars match with minimal conditions, try to narrow down by unique description word
      for (const keyword of normalizedDescription) {
        const matchingCars = carsWithLocation.filter(car =>
          car.description && normalizeString(car.description).includes(keyword)
        );

        if (matchingCars.length === 1) {
          const car = matchingCars[0];
          telegramLogger(`- ${car.make} ${car.model} ${car.badge || ''} ${car.rego} ${car.description || ''} Location = ${car.location} identified at stage 6 (description word "${keyword}" uniquely matches with minimal conditions)`, 'identification');
          return { car, status: 'found' };
        }
      }
      telegramLogger(`- Car not identified - multiple cars with minimal conditions at stage 6`, 'identification');
      return { car: null, status: 'multiple_found' };
    }
  }

  telegramLogger(`- Car not identified - no unique car found after all stages`, 'identification');
  return { car: null, status: 'not_found' };
};

module.exports = { normalizeString, identifyUniqueCar };