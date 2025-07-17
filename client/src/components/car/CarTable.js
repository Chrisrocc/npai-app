import React, { useState, useEffect } from 'react';
import { getRowBackgroundColor } from '../../utils/carListUtils';
import './CarTable.css';
import NextDestinationsEditor from './NextDestinationsEditor';
import ChecklistEditor from './ChecklistEditor';
import axios from '../../utils/axiosConfig';

const CarTable = ({
  tableCars = [],
  tableSide,
  isRightTable = false,
  onSelectCar,
  sortConfig = { key: null, direction: 'asc' },
  handleSort,
  startEditing,
  editingField,
  editValue,
  handleEditChange,
  saveEdit,
  cancelEdit,
  handleOpenProfile,
  handleDelete,
  showPhotos = false,
  refreshTrigger, // New prop to trigger refresh
}) => {
  const [editingNextCarId, setEditingNextCarId] = useState(null);
  const [editingChecklistCarId, setEditingChecklistCarId] = useState(null);
  const [cars, setCars] = useState(tableCars);

  useEffect(() => {
    console.log('CarTable useEffect, tableCars:', tableCars);
    setCars(tableCars || []);
  }, [tableCars, refreshTrigger]); // Refresh on trigger

  const fetchCarsWithoutRefresh = async () => {
    try {
      const response = await axios.get('/api/cars');
      console.log('Fetched cars data:', response.data);
      setCars(response.data || []);
    } catch (err) {
      console.error('Error fetching cars:', err);
    }
  };

  const handleSetCurrentLocation = async (carId, newLocation, indexToRemove) => {
    try {
      const car = cars.find(c => c._id === carId);
      if (!car) throw new Error('Car not found');
      const updatedNext = [...(car.next || [])];
      updatedNext.splice(indexToRemove, 1);
      await axios.post(`/api/cars/${carId}/set-location`, {
        location: newLocation,
        message: `Set as current location from next list`,
        next: updatedNext,
      });
      await fetchCarsWithoutRefresh();
    } catch (err) {
      console.error('Error setting current location:', err);
      alert('Failed to set current location');
    }
  };

  if (!Array.isArray(cars)) {
    console.error('CarTable error: cars is not an array', cars);
    return <div>Error: Invalid car data</div>;
  }

  return (
    <div
      style={{
        width: '100%',
        overflowX: 'auto',
        overflowY: 'hidden',
        boxSizing: 'border-box',
      }}
    >
      {editingNextCarId && (
        <NextDestinationsEditor
          carId={editingNextCarId}
          nextDestinations={cars.find(car => car._id === editingNextCarId)?.next || []}
          onSave={() => setEditingNextCarId(null)}
          onCancel={() => setEditingNextCarId(null)}
          fetchCars={fetchCarsWithoutRefresh}
          onSetCurrentLocation={(newLocation, index) => handleSetCurrentLocation(editingNextCarId, newLocation, index)}
        />
      )}
      {editingChecklistCarId && (
        <ChecklistEditor
          carId={editingChecklistCarId}
          checklist={cars.find(car => car._id === editingChecklistCarId)?.checklist || []}
          onSave={() => setEditingChecklistCarId(null)}
          onCancel={() => setEditingChecklistCarId(null)}
          fetchCars={fetchCarsWithoutRefresh}
        />
      )}
      <table
        className="CarTable"
        style={{
          width: '100%',
          minWidth: '100%',
          maxWidth: '100%',
          borderCollapse: 'separate',
          borderSpacing: 0,
          fontFamily: "'Roboto', sans-serif",
          fontSize: '14px',
          backgroundColor: '#fff',
          borderRadius: '8px',
          overflow: 'hidden',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
          tableLayout: 'auto',
        }}
      >
        <thead>
          <tr style={{ height: '40px', backgroundColor: '#e8ecef' }}>
            {[
              ...(showPhotos ? [{ key: 'photos', label: 'Photo' }] : []),
              { key: 'make', label: 'Make' },
              { key: 'model', label: 'Model' },
              { key: 'badge', label: 'Badge' },
              { key: 'rego', label: 'Rego' },
              { key: 'year', label: 'Year' },
              { key: 'description', label: 'Description' },
              { key: 'checklist', label: 'What It Needs' },
              { key: 'location', label: 'Location' },
              { key: 'status', label: 'Status' },
              { key: 'next', label: 'Next' },
              { key: 'actions', label: 'Actions' },
            ].map(({ key, label }) => (
              <th
                key={key}
                style={{
                  border: '1px solid #dee2e6',
                  padding: '4px',
                  height: '40px',
                  fontWeight: '600',
                  color: '#495057',
                  textAlign: 'left',
                  minWidth: '30px',
                  position: 'relative',
                  cursor: key !== 'actions' ? 'pointer' : 'default',
                  boxSizing: 'border-box',
                  whiteSpace: 'nowrap',
                }}
                onClick={() => key !== 'actions' && handleSort?.(key)}
              >
                {label}{' '}
                {sortConfig.key === key
                  ? sortConfig.direction === 'asc'
                    ? '↑'
                    : sortConfig.direction === 'desc'
                    ? '↓'
                    : ''
                  : ''}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {cars.map((car, index) => {
            const isSold = (car.stage || 'In Works') === 'Sold';
            const isFirstSold = isRightTable && index === 0 && isSold;
            const isLastSold =
              isRightTable &&
              isSold &&
              (index === cars.length - 1 || (cars[index + 1] && (cars[index + 1].stage || 'In Works') !== 'Sold'));

            if (showPhotos) {
              if (car.photos && car.photos.length > 0) {
                const photoUrl = car.photos[0].startsWith('http')
                  ? car.photos[0]
                  : `${process.env.REACT_APP_API_URL || ''}/uploads/${car.photos[0].startsWith('Uploads/') ? car.photos[0] : 'Uploads/' + car.photos[0]}`;
                console.log(`Car ${car.rego} first photo URL: ${photoUrl}, Photos array: ${JSON.stringify(car.photos)}`);
              } else {
                console.log(`Car ${car.rego} has no photos or photos array is empty`);
              }
            }

            return (
              <tr
                key={car._id}
                style={{
                  height: '30px',
                  backgroundColor: getRowBackgroundColor(car.status),
                  transition: 'background-color 0.2s',
                  cursor: onSelectCar ? 'pointer' : 'default',
                }}
                onClick={() => onSelectCar?.(car._id)}
              >
                {showPhotos && (
                  <td
                    style={{
                      border: '1px solid #dee2e6',
                      padding: '4px',
                      height: '30px',
                      verticalAlign: 'middle',
                      position: 'relative',
                      boxShadow: isSold ? 'inset 2px 0 0 0 #343a40' : 'none',
                      ...(isFirstSold ? { boxShadow: 'inset 2px 2px 0 0 #343a40' } : {}),
                      ...(isLastSold
                        ? {
                            boxShadow: 'inset 2px 0 0 0 #343a40, inset 0 -2px 0 0 #343a40',
                          }
                        : {}),
                      boxSizing: 'border-box',
                    }}
                  >
                    {car.photos && car.photos.length > 0 ? (
                      <img
                        src={
                          car.photos[0].startsWith('http')
                            ? car.photos[0]
                            : `${process.env.REACT_APP_API_URL || ''}/uploads/${car.photos[0].startsWith('Uploads/') ? car.photos[0] : 'Uploads/' + car.photos[0]}`
                        }
                        alt={`Car ${car.rego}`}
                        style={{
                          width: '100%',
                          maxWidth: '34px',
                          height: '30px',
                          objectFit: 'cover',
                          verticalAlign: 'middle',
                          borderRadius: '4px',
                        }}
                        onError={(e) => {
                          console.error(`Failed to load image for car ${car.rego}: ${e.target.src}`);
                          e.target.style.display = 'none'; // Hide on error, leaving cell blank
                        }}
                      />
                    ) : (
                      <span
                        style={{
                          fontSize: '12px',
                          color: '#495057',
                          display: 'inline-block',
                          width: '100%',
                          maxWidth: '34px',
                          textAlign: 'center',
                        }}
                      >
                        -
                      </span>
                    )}
                  </td>
                )}
                <td
                  style={{
                    border: '1px solid #dee2e6',
                    padding: '4px',
                    height: '30px',
                    verticalAlign: 'middle',
                    position: 'relative',
                    boxShadow: isFirstSold ? 'inset 0 2px 0 0 #343a40' : isLastSold ? 'inset 0 -2px 0 0 #343a40' : 'none',
                    boxSizing: 'border-box',
                    whiteSpace: 'nowrap',
                  }}
                  onDoubleClick={(e) => startEditing?.(car._id, 'make', car.make, e)}
                >
                  {editingField && editingField.carId === car._id && editingField.field === 'make' ? (
                    <input
                      type="text"
                      value={editValue || ''}
                      onChange={handleEditChange}
                      onBlur={() => saveEdit?.(car._id)}
                      onKeyPress={(e) => e.key === 'Enter' && saveEdit?.(car._id)}
                      onKeyDown={(e) => e.key === 'Escape' && cancelEdit?.()}
                      onClick={(e) => e.stopPropagation()}
                      autoFocus
                      style={{
                        width: '100%',
                        padding: '4px',
                        fontSize: '12px',
                        height: '20px',
                        border: '1px solid #ced4da',
                        borderRadius: '4px',
                        boxSizing: 'border-box',
                      }}
                    />
                  ) : (
                    <span
                      style={{
                        fontSize: '12px',
                        color: '#495057',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {car.make || '-'}
                    </span>
                  )}
                </td>
                <td
                  style={{
                    border: '1px solid #dee2e6',
                    padding: '4px',
                    height: '30px',
                    verticalAlign: 'middle',
                    position: 'relative',
                    boxShadow: isFirstSold ? 'inset 0 2px 0 0 #343a40' : isLastSold ? 'inset 0 -2px 0 0 #343a40' : 'none',
                    boxSizing: 'border-box',
                    whiteSpace: 'nowrap',
                  }}
                  onDoubleClick={(e) => startEditing?.(car._id, 'model', car.model, e)}
                >
                  {editingField && editingField.carId === car._id && editingField.field === 'model' ? (
                    <input
                      type="text"
                      value={editValue || ''}
                      onChange={handleEditChange}
                      onBlur={() => saveEdit?.(car._id)}
                      onKeyPress={(e) => e.key === 'Enter' && saveEdit?.(car._id)}
                      onKeyDown={(e) => e.key === 'Escape' && cancelEdit?.()}
                      onClick={(e) => e.stopPropagation()}
                      autoFocus
                      style={{
                        width: '100%',
                        padding: '4px',
                        fontSize: '12px',
                        height: '20px',
                        border: '1px solid #ced4da',
                        borderRadius: '4px',
                        boxSizing: 'border-box',
                      }}
                    />
                  ) : (
                    <span
                      style={{
                        fontSize: '12px',
                        color: '#495057',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {car.model || '-'}
                    </span>
                  )}
                </td>
                <td
                  className="badge-column"
                  title={car.badge || ''}
                  style={{
                    border: '1px solid #dee2e6',
                    padding: '4px',
                    height: '30px',
                    verticalAlign: 'middle',
                    position: 'relative',
                    boxShadow: isFirstSold ? 'inset 0 2px 0 0 #343a40' : isLastSold ? 'inset 0 -2px 0 0 #343a40' : 'none',
                    boxSizing: 'border-box',
                  }}
                  onDoubleClick={(e) => startEditing?.(car._id, 'badge', car.badge, e)}
                >
                  {editingField && editingField.carId === car._id && editingField.field === 'badge' ? (
                    <input
                      type="text"
                      value={editValue || ''}
                      onChange={handleEditChange}
                      onBlur={() => saveEdit?.(car._id)}
                      onKeyPress={(e) => e.key === 'Enter' && saveEdit?.(car._id)}
                      onKeyDown={(e) => e.key === 'Escape' && cancelEdit?.()}
                      onClick={(e) => e.stopPropagation()}
                      autoFocus
                      style={{
                        width: '100%',
                        padding: '4px',
                        fontSize: '12px',
                        height: '20px',
                        border: '1px solid #ced4da',
                        borderRadius: '4px',
                        boxSizing: 'border-box',
                      }}
                    />
                  ) : (
                    <span
                      style={{
                        fontSize: '12px',
                        color: '#495057',
                      }}
                    >
                      {car.badge || '-'}
                    </span>
                  )}
                </td>
                <td
                  style={{
                    border: '1px solid #dee2e6',
                    padding: '4px',
                    height: '30px',
                    verticalAlign: 'middle',
                    position: 'relative',
                    boxShadow: isFirstSold ? 'inset 0 2px 0 0 #343a40' : isLastSold ? 'inset 0 -2px 0 0 #343a40' : 'none',
                    boxSizing: 'border-box',
                    whiteSpace: 'nowrap',
                  }}
                  onDoubleClick={(e) => startEditing?.(car._id, 'rego', car.rego, e)}
                >
                  {editingField && editingField.carId === car._id && editingField.field === 'rego' ? (
                    <input
                      type="text"
                      value={editValue || ''}
                      onChange={handleEditChange}
                      onBlur={() => saveEdit?.(car._id)}
                      onKeyPress={(e) => e.key === 'Enter' && saveEdit?.(car._id)}
                      onKeyDown={(e) => e.key === 'Escape' && cancelEdit?.()}
                      onClick={(e) => e.stopPropagation()}
                      autoFocus
                      pattern="[a-zA-Z0-9]{1,6}"
                      title="Rego must be 1-6 alphanumeric characters"
                      maxLength={6}
                      style={{
                        width: '100%',
                        padding: '4px',
                        fontSize: '12px',
                        height: '20px',
                        border: '1px solid #ced4da',
                        borderRadius: '4px',
                        boxSizing: 'border-box',
                      }}
                    />
                  ) : (
                    <span
                      style={{
                        fontSize: '12px',
                        color: '#495057',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {car.rego || '-'}
                    </span>
                  )}
                </td>
                <td
                  style={{
                    border: '1px solid #dee2e6',
                    padding: '4px',
                    height: '30px',
                    verticalAlign: 'middle',
                    position: 'relative',
                    boxShadow: isFirstSold ? 'inset 0 2px 0 0 #343a40' : isLastSold ? 'inset 0 -2px 0 0 #343a40' : 'none',
                    boxSizing: 'border-box',
                    whiteSpace: 'nowrap',
                  }}
                  onDoubleClick={(e) => startEditing?.(car._id, 'year', car.year, e)}
                >
                  {editingField && editingField.carId === car._id && editingField.field === 'year' ? (
                    <input
                      type="number"
                      value={editValue || ''}
                      onChange={handleEditChange}
                      onBlur={() => saveEdit?.(car._id)}
                      onKeyPress={(e) => e.key === 'Enter' && saveEdit?.(car._id)}
                      onKeyDown={(e) => e.key === 'Escape' && cancelEdit?.()}
                      onClick={(e) => e.stopPropagation()}
                      autoFocus
                      style={{
                        width: '100%',
                        padding: '4px',
                        fontSize: '12px',
                        height: '20px',
                        border: '1px solid #ced4da',
                        borderRadius: '4px',
                        boxSizing: 'border-box',
                      }}
                    />
                  ) : (
                    <span
                      style={{
                        fontSize: '12px',
                        color: '#495057',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {car.year || '-'}
                    </span>
                  )}
                </td>
                <td
                  style={{
                    border: '1px solid #dee2e6',
                    padding: '4px',
                    height: '30px',
                    verticalAlign: 'middle',
                    position: 'relative',
                    boxShadow: isFirstSold ? 'inset 0 2px 0 0 #343a40' : isLastSold ? 'inset 0 -2px 0 0 #343a40' : 'none',
                    boxSizing: 'border-box',
                  }}
                  onDoubleClick={(e) => startEditing?.(car._id, 'description', car.description, e)}
                >
                  {editingField && editingField.carId === car._id && editingField.field === 'description' ? (
                    <textarea
                      value={editValue || ''}
                      onChange={handleEditChange}
                      onBlur={() => saveEdit?.(car._id)}
                      onKeyPress={(e) => e.key === 'Enter' && saveEdit?.(car._id)}
                      onKeyDown={(e) => e.key === 'Escape' && cancelEdit?.()}
                      onClick={(e) => e.stopPropagation()}
                      autoFocus
                      style={{
                        width: '100%',
                        padding: '4px',
                        fontSize: '12px',
                        height: '40px',
                        resize: 'none',
                        border: '1px solid #ced4da',
                        borderRadius: '4px',
                        boxSizing: 'border-box',
                      }}
                    />
                  ) : (
                    <span
                      style={{
                        fontSize: '12px',
                        color: '#495057',
                        whiteSpace: 'normal',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {car.description || '-'}
                    </span>
                  )}
                </td>
                <td
                  style={{
                    border: '1px solid #dee2e6',
                    padding: '4px',
                    height: '30px',
                    verticalAlign: 'middle',
                    position: 'relative',
                    boxShadow: isFirstSold ? 'inset 0 2px 0 0 #343a40' : isLastSold ? 'inset 0 -2px 0 0 #343a40' : 'none',
                    boxSizing: 'border-box',
                  }}
                  onDoubleClick={(e) => {
                    e.stopPropagation();
                    setEditingChecklistCarId(car._id);
                  }}
                >
                  <span
                    style={{
                      fontSize: '12px',
                      color: '#495057',
                      whiteSpace: 'normal',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {car.checklist && car.checklist.length > 0 ? car.checklist.join(', ') : '-'}
                  </span>
                </td>
                <td
                  style={{
                    border: '1px solid #dee2e6',
                    padding: '4px',
                    height: '30px',
                    verticalAlign: 'middle',
                    position: 'relative',
                    boxShadow: isFirstSold ? 'inset 0 2px 0 0 #343a40' : isLastSold ? 'inset 0 -2px 0 0 #343a40' : 'none',
                    boxSizing: 'border-box',
                    whiteSpace: 'nowrap',
                  }}
                  onDoubleClick={(e) => startEditing?.(car._id, 'location', car.location, e)}
                >
                  {editingField && editingField.carId === car._id && editingField.field === 'location' ? (
                    <input
                      type="text"
                      value={editValue || ''}
                      onChange={handleEditChange}
                      onBlur={() => saveEdit?.(car._id)}
                      onKeyPress={(e) => e.key === 'Enter' && saveEdit?.(car._id)}
                      onKeyDown={(e) => e.key === 'Escape' && cancelEdit?.()}
                      onClick={(e) => e.stopPropagation()}
                      autoFocus
                      style={{
                        width: '100%',
                        padding: '4px',
                        fontSize: '12px',
                        height: '20px',
                        border: '1px solid #ced4da',
                        borderRadius: '4px',
                        boxSizing: 'border-box',
                      }}
                    />
                  ) : (
                    <span
                      style={{
                        fontSize: '12px',
                        color: '#495057',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {car.location || '-'}
                    </span>
                  )}
                </td>
                <td
                  style={{
                    border: '1px solid #dee2e6',
                    padding: '4px',
                    height: '30px',
                    verticalAlign: 'middle',
                    position: 'relative',
                    boxShadow: isFirstSold ? 'inset 0 2px 0 0 #343a40' : isLastSold ? 'inset 0 -2px 0 0 #343a40' : 'none',
                    boxSizing: 'border-box',
                    whiteSpace: 'nowrap',
                  }}
                  onDoubleClick={(e) => startEditing?.(car._id, 'status', car.status, e)}
                >
                  {editingField && editingField.carId === car._id && editingField.field === 'status' ? (
                    <input
                      type="text"
                      value={editValue || ''}
                      onChange={handleEditChange}
                      onBlur={() => saveEdit?.(car._id)}
                      onKeyPress={(e) => e.key === 'Enter' && saveEdit?.(car._id)}
                      onKeyDown={(e) => e.key === 'Escape' && cancelEdit?.()}
                      onClick={(e) => e.stopPropagation()}
                      autoFocus
                      style={{
                        width: '100%',
                        padding: '4px',
                        fontSize: '12px',
                        height: '20px',
                        border: '1px solid #ced4da',
                        borderRadius: '4px',
                        boxSizing: 'border-box',
                      }}
                    />
                  ) : (
                    <span
                      style={{
                        fontSize: '12px',
                        color: '#495057',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {car.status || '-'}
                    </span>
                  )}
                </td>
                <td
                  style={{
                    border: '1px solid #dee2e6',
                    padding: '4px',
                    height: '30px',
                    verticalAlign: 'middle',
                    position: 'relative',
                    boxShadow: isSold ? 'inset -2px 0 0 0 #343a40' : 'none',
                    ...(isFirstSold ? { boxShadow: 'inset -2px 2px 0 0 #343a40' } : {}),
                    ...(isLastSold
                      ? {
                          boxShadow: 'inset -2px 0 0 0 #343a40, inset 0 -2px 0 0 #343a40',
                        }
                      : {}),
                    boxSizing: 'border-box',
                    whiteSpace: 'nowrap',
                  }}
                  onDoubleClick={(e) => {
                    e.stopPropagation();
                    setEditingNextCarId(car._id);
                  }}
                >
                  <span
                    style={{
                      fontSize: '12px',
                      color: '#495057',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {car.next && car.next.length > 0 ? car.next.map(entry => entry.location).join(', ') : '-'}
                  </span>
                </td>
                <td
                  style={{
                    border: '1px solid #dee2e6',
                    padding: '4px',
                    height: '30px',
                    verticalAlign: 'middle',
                    position: 'relative',
                    boxShadow: isSold ? 'inset -2px 0 0 0 #343a40' : 'none',
                    ...(isFirstSold ? { boxShadow: 'inset -2px 2px 0 0 #343a40' } : {}),
                    ...(isLastSold
                      ? {
                          boxShadow: 'inset -2px 0 0 0 #343a40, inset 0 -2px 0 0 #343a40',
                        }
                      : {}),
                    boxSizing: 'border-box',
                    whiteSpace: 'nowrap',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                    }}
                  >
                    {!onSelectCar && (
                      <>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenProfile?.(car._id);
                          }}
                          style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            fontSize: '14px',
                            color: '#007bff',
                            transition: 'color 0.2s',
                          }}
                          onMouseEnter={(e) => (e.target.style.color = '#0056b3')}
                          onMouseLeave={(e) => (e.target.style.color = '#007bff')}
                        >
                          ⋮
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete?.(car._id);
                          }}
                          style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            fontSize: '14px',
                            color: '#dc3545',
                            transition: 'color 0.2s',
                          }}
                          onMouseEnter={(e) => (e.target.style.color = '#b02a37')}
                          onMouseLeave={(e) => (e.target.style.color = '#dc3545')}
                        >
                          🗑️
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default CarTable;
