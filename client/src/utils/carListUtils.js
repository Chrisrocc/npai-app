// src/utils/carListUtils.js

export const sortCars = (carsToSort, sortConfig) => {
  if (!sortConfig.key || !sortConfig.direction) return carsToSort;
  return [...carsToSort].sort((a, b) => {
    let aValue = a[sortConfig.key];
    let bValue = b[sortConfig.key];

    // Handle special cases for certain keys
    if (sortConfig.key === 'checklist') {
      aValue = a.checklist && a.checklist.length > 0 ? a.checklist.join(', ') : '';
      bValue = b.checklist && b.checklist.length > 0 ? b.checklist.join(', ') : '';
    } else if (sortConfig.key === 'next') {
      // Since next is now an array of objects, join the locations for sorting
      aValue = a.next && a.next.length > 0 ? a.next.map(entry => entry.location).join(', ') : '';
      bValue = b.next && b.next.length > 0 ? b.next.map(entry => entry.location).join(', ') : '';
    }

    aValue = aValue || '';
    bValue = bValue || '';

    if (sortConfig.direction === 'asc') {
      return aValue.toString().localeCompare(bValue.toString(), undefined, { numeric: true, sensitivity: 'base' });
    } else {
      return bValue.toString().localeCompare(aValue.toString(), undefined, { numeric: true, sensitivity: 'base' });
    }
  });
};

export const filterCars = (carsToFilter, selectedStages, searchTerm) => {
  // Ensure carsToFilter is an array to prevent crashes
  if (!Array.isArray(carsToFilter)) return [];

  let filteredCars = carsToFilter.filter(car => selectedStages.includes(car.stage || 'In Works'));

  if (searchTerm.trim() !== '') {
    const searchLower = searchTerm.toLowerCase().trim();
    filteredCars = filteredCars.filter(car => {
      return (
        (car.make && car.make.toLowerCase().includes(searchLower)) ||
        (car.model && car.model.toLowerCase().includes(searchLower)) ||
        (car.badge && car.badge.toLowerCase().includes(searchLower)) ||
        (car.rego && car.rego.toLowerCase().includes(searchLower)) ||
        (car.year && car.year.toString().includes(searchLower)) ||
        (car.description && car.description.toLowerCase().includes(searchLower)) ||
        (car.checklist && car.checklist.some(item => item.toLowerCase().includes(searchLower))) ||
        (car.location && car.location.toLowerCase().includes(searchLower)) ||
        (car.status && car.status.toLowerCase().includes(searchLower)) ||
        // Since next is now an array of objects, join the locations for searching
        (car.next && car.next.length > 0 && car.next.map(entry => entry.location).join(', ').toLowerCase().includes(searchLower))
      );
    });
  }

  return filteredCars;
};

export const getRowBackgroundColor = (status) => {
  if (!status) return 'transparent';

  const statusLower = status.toLowerCase();
  if (statusLower === 'ready') {
    return '#e6f4ea';
  }

  const hasToday = statusLower.includes('today');
  const hasNot = statusLower.includes('not');
  if (hasToday && !hasNot) {
    return '#fff4e6';
  }

  const timeRegex = /^(?:\d{1,2}(?::\d{2})?(?:pm|am)?)$/i;
  if (timeRegex.test(statusLower)) {
    return '#fff4e6';
  }

  const afterTimeRegex = /after\s+\d{1,2}(?::\d{2})?(?:pm|am)?/i;
  if (afterTimeRegex.test(statusLower)) {
    return '#fff4e6';
  }

  return 'transparent';
};