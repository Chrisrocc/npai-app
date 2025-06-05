// src/components/shared/CarSelectTable.js
import React, { useState, useEffect, useCallback, useRef } from 'react';
import axios from '../../utils/axiosConfig';
import { filterCars, sortCars, getRowBackgroundColor } from '../../utils/carListUtils'; // Import functions from carListUtils

const CarSelectTable = ({ onSelectCar, onClose, multiSelect = false, selectedCarIds = [], prePopulateSearch = '' }) => {
  const [cars, setCars] = useState([]);
  const [carLoading, setCarLoading] = useState(false);
  const [carError, setCarError] = useState(null);
  const [selectedStages, setSelectedStages] = useState(['In Works', 'In Works/Online', 'Online', 'Sold']);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: null });
  const [searchTerm, setSearchTerm] = useState(prePopulateSearch);
  const [selectedCars, setSelectedCars] = useState(new Set(selectedCarIds));
  const [columnWidths, setColumnWidths] = useState(() => {
    const savedWidths = localStorage.getItem('carSelectColumnWidths');
    return savedWidths
      ? JSON.parse(savedWidths)
      : {
          photos: 50,
          make: 100,
          model: 100,
          badge: 100,
          rego: 100,
          year: 80,
          description: 150,
          checklist: 150,
          location: 100,
          status: 100,
          next: 100,
        };
  });
  const resizingRef = useRef(null);
  const startXRef = useRef(0);
  const startWidthRef = useRef(0);
  const [, forceUpdate] = useState(0);

  useEffect(() => {
    localStorage.setItem('carSelectColumnWidths', JSON.stringify(columnWidths));
  }, [columnWidths]);

  const fetchCars = async () => {
    try {
      setCarLoading(true);
      setCarError(null);
      console.log('Fetching cars from http://localhost:5000/api/cars...');
      const response = await axios.get('http://localhost:5000/api/cars');
      console.log('Cars response:', response.data);
      if (!Array.isArray(response.data)) {
        throw new Error('Expected an array of cars, but received: ' + JSON.stringify(response.data));
      }
      setCars(response.data);
      setCarLoading(false);
    } catch (err) {
      console.error('Error fetching cars:', err);
      setCarError('Failed to fetch cars: ' + err.message);
      setCarLoading(false);
    }
  };

  useEffect(() => {
    fetchCars();
  }, []);

  const handleStageFilter = (stage) => {
    if (selectedStages.includes(stage)) {
      setSelectedStages(selectedStages.filter((s) => s !== stage));
    } else {
      setSelectedStages([...selectedStages, stage]);
    }
  };

  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key) {
      if (sortConfig.direction === 'asc') {
        direction = 'desc';
      } else if (sortConfig.direction === 'desc') {
        direction = null;
      }
    }
    setSortConfig({ key, direction });
  };

  const startResizing = (key, e) => {
    e.preventDefault();
    e.stopPropagation();
    resizingRef.current = key;
    startXRef.current = e.clientX;
    startWidthRef.current = columnWidths[key] || 100;

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', stopResizing);
    document.body.style.userSelect = 'none';
  };

  const handleMouseMove = useCallback((e) => {
    e.stopPropagation();
    if (resizingRef.current) {
      const delta = e.clientX - startXRef.current;
      const newWidth = Math.max(30, startWidthRef.current + delta);
      setColumnWidths((prev) => {
        const updated = { ...prev, [resizingRef.current]: newWidth };
        forceUpdate((n) => n + 1);
        return updated;
      });
    }
  }, []);

  const stopResizing = useCallback(() => {
    resizingRef.current = null;
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', stopResizing);
    document.body.style.userSelect = '';
  }, [handleMouseMove]);

  useEffect(() => {
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', stopResizing);
    };
  }, [handleMouseMove, stopResizing]);

  const handleCarClick = (carId) => {
    if (multiSelect) {
      // Toggle selection for multi-select
      setSelectedCars((prev) => {
        const newSelected = new Set(prev);
        if (newSelected.has(carId)) {
          newSelected.delete(carId);
        } else {
          newSelected.add(carId);
        }
        return newSelected;
      });
    } else {
      // Single select for editing
      console.log('Car clicked with ID:', carId);
      onSelectCar([carId]);
    }
  };

  const handleDone = () => {
    if (multiSelect) {
      const selectedArray = Array.from(selectedCars);
      console.log('Done selecting cars:', selectedArray);
      onSelectCar(selectedArray);
    }
  };

  const handleSearchChange = (e) => {
    console.log('CarSelectTable search term updating:', e.target.value); // Debug log
    setSearchTerm(e.target.value);
  };

  const filteredCars = filterCars(cars, selectedStages, searchTerm) || [];
  const sortedCars = sortCars(filteredCars, sortConfig);

  return (
    <>
      <div style={{ overflowX: 'auto' }}>
        <div style={{ marginBottom: '10px', display: 'flex', flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: '10px' }}>
          <input
            type="text"
            value={searchTerm}
            onChange={handleSearchChange}
            placeholder="Search cars..."
            style={{
              padding: '6px 12px',
              width: 'clamp(150px, 20vw, 200px)',
              border: '1px solid #ced4da',
              borderRadius: '4px',
              fontSize: 'clamp(12px, 1.5vw, 14px)',
            }}
          />
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {['In Works', 'In Works/Online', 'Online', 'Sold'].map((stage) => (
              <button
                key={stage}
                onClick={() => handleStageFilter(stage)}
                style={{
                  padding: 'clamp(4px, 1vw, 6px) clamp(8px, 1.5vw, 12px)',
                  backgroundColor: selectedStages.includes(stage) ? '#007bff' : '#e9ecef',
                  color: selectedStages.includes(stage) ? 'white' : '#495057',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: 'clamp(12px, 1.5vw, 14px)',
                  fontWeight: '500',
                  transition: 'background-color 0.2s, color 0.2s',
                  minWidth: 'fit-content',
                }}
                onMouseEnter={(e) =>
                  !selectedStages.includes(stage) &&
                  (e.target.style.backgroundColor = '#dee2e6')
                }
                onMouseLeave={(e) =>
                  !selectedStages.includes(stage) &&
                  (e.target.style.backgroundColor = '#e9ecef')
                }
              >
                {stage}
              </button>
            ))}
          </div>
          {multiSelect && (
            <button
              onClick={handleDone}
              style={{
                padding: '6px 12px',
                backgroundColor: '#28a745',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '14px',
              }}
            >
              Done ({selectedCars.size} selected)
            </button>
          )}
        </div>
        {carLoading ? (
          <div style={{ textAlign: 'center', padding: '20px', fontSize: 'clamp(14px, 2vw, 16px)', color: '#495057' }}>
            Loading cars...
          </div>
        ) : carError ? (
          <div style={{ textAlign: 'center', padding: '20px', color: '#dc3545', fontSize: 'clamp(14px, 2vw, 16px)' }}>
            {carError}
          </div>
        ) : sortedCars.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '20px', fontSize: 'clamp(14px, 2vw, 16px)', color: '#6c757d' }}>
            No cars match the selected filters.
          </div>
        ) : (
          <table
            style={{
              width: '100%',
              borderCollapse: 'separate',
              borderSpacing: 0,
              fontFamily: "'Roboto', sans-serif",
              fontSize: 'clamp(10px, 1.5vw, 14px)',
              backgroundColor: '#fff',
              borderRadius: '8px',
              overflow: 'hidden',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
              tableLayout: 'fixed',
            }}
          >
            <thead>
              <tr style={{ backgroundColor: '#e8ecef', height: 'clamp(30px, 4vw, 40px)' }}>
                {multiSelect && (
                  <th
                    style={{
                      border: '1px solid #dee2e6',
                      padding: 'clamp(2px, 0.5vw, 8px)',
                      width: '30px',
                    }}
                  >
                    Select
                  </th>
                )}
                {[
                  { key: 'photos', label: 'Photo' },
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
                ].map(({ key, label }) => (
                  <th
                    key={key}
                    style={{
                      border: '1px solid #dee2e6',
                      padding: 'clamp(2px, 0.5vw, 8px)',
                      fontWeight: '600',
                      textAlign: 'left',
                      width: `${columnWidths[key]}px`,
                      minWidth: '30px',
                      position: 'relative',
                      cursor: 'pointer',
                    }}
                    onClick={() => handleSort(key)}
                  >
                    {label}{' '}
                    {sortConfig.key === key
                      ? sortConfig.direction === 'asc'
                        ? '↑'
                        : sortConfig.direction === 'desc'
                        ? '↓'
                        : ''
                      : ''}
                    <div
                      style={{
                        position: 'absolute',
                        right: '-2.5px',
                        top: 0,
                        width: '5px',
                        height: '100%',
                        cursor: 'col-resize',
                      }}
                      onMouseDown={(e) => startResizing(key, e)}
                      onMouseEnter={(e) => (e.target.style.backgroundColor = '#ccc')}
                      onMouseLeave={(e) => (e.target.style.backgroundColor = 'transparent')}
                    />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sortedCars.map((car) => (
                <tr
                  key={car._id}
                  style={{
                    cursor: 'pointer',
                    height: 'clamp(25px, 3vw, 30px)',
                    backgroundColor: getRowBackgroundColor(car.status),
                    transition: 'background-color 0.2s',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f8f9fa')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = getRowBackgroundColor(car.status))}
                >
                  {multiSelect && (
                    <td style={{ border: '1px solid #dee2e6', padding: 'clamp(2px, 0.5vw, 8px)', width: '30px' }}>
                      <input
                        type="checkbox"
                        checked={selectedCars.has(car._id)}
                        onChange={() => handleCarClick(car._id)}
                        onClick={(e) => e.stopPropagation()}
                      />
                    </td>
                  )}
                  <td
                    style={{ border: '1px solid #dee2e6', padding: 'clamp(2px, 0.5vw, 8px)', width: `${columnWidths.photos}px` }}
                    onClick={() => handleCarClick(car._id)}
                  >
                    {car.photos && car.photos.length > 0 ? (
                      <img
                        src={`http://localhost:5000/${car.photos[0]}`}
                        alt={`Car ${car.rego}`}
                        style={{
                          width: '100%',
                          maxWidth: `clamp(24px, 3vw, ${columnWidths.photos - 16}px)`,
                          height: 'clamp(20px, 2.5vw, 30px)',
                          objectFit: 'cover',
                          borderRadius: '4px',
                        }}
                        onError={(e) => (e.target.style.display = 'none')}
                      />
                    ) : null}
                  </td>
                  <td
                    style={{
                      border: '1px solid #dee2e6',
                      padding: 'clamp(2px, 0.5vw, 8px)',
                      width: `${columnWidths.make}px`,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                    onClick={() => handleCarClick(car._id)}
                  >
                    <span style={{ fontSize: 'clamp(10px, 1.2vw, 12px)' }}>{car.make || '-'}</span>
                  </td>
                  <td
                    style={{
                      border: '1px solid #dee2e6',
                      padding: 'clamp(2px, 0.5vw, 8px)',
                      width: `${columnWidths.model}px`,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                    onClick={() => handleCarClick(car._id)}
                  >
                    <span style={{ fontSize: 'clamp(10px, 1.2vw, 12px)' }}>{car.model || '-'}</span>
                  </td>
                  <td
                    style={{
                      border: '1px solid #dee2e6',
                      padding: 'clamp(2px, 0.5vw, 8px)',
                      width: `${columnWidths.badge}px`,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                    onClick={() => handleCarClick(car._id)}
                  >
                    <span style={{ fontSize: 'clamp(10px, 1.2vw, 12px)' }}>{car.badge || '-'}</span>
                  </td>
                  <td
                    style={{
                      border: '1px solid #dee2e6',
                      padding: 'clamp(2px, 0.5vw, 8px)',
                      width: `${columnWidths.rego}px`,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                    onClick={() => handleCarClick(car._id)}
                  >
                    <span style={{ fontSize: 'clamp(10px, 1.2vw, 12px)' }}>{car.rego || '-'}</span>
                  </td>
                  <td
                    style={{
                      border: '1px solid #dee2e6',
                      padding: 'clamp(2px, 0.5vw, 8px)',
                      width: `${columnWidths.year}px`,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                    onClick={() => handleCarClick(car._id)}
                  >
                    <span style={{ fontSize: 'clamp(10px, 1.2vw, 12px)' }}>{car.year || '-'}</span>
                  </td>
                  <td
                    style={{
                      border: '1px solid #dee2e6',
                      padding: 'clamp(2px, 0.5vw, 8px)',
                      width: `${columnWidths.description}px`,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'normal',
                    }}
                    onClick={() => handleCarClick(car._id)}
                  >
                    <span style={{ fontSize: 'clamp(10px, 1.2vw, 12px)' }}>{car.description || '-'}</span>
                  </td>
                  <td
                    style={{
                      border: '1px solid #dee2e6',
                      padding: 'clamp(2px, 0.5vw, 8px)',
                      width: `${columnWidths.checklist}px`,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'normal',
                    }}
                    onClick={() => handleCarClick(car._id)}
                  >
                    <span style={{ fontSize: 'clamp(10px, 1.2vw, 12px)' }}>
                      {car.checklist && car.checklist.length > 0 ? car.checklist.join(', ') : '-'}
                    </span>
                  </td>
                  <td
                    style={{
                      border: '1px solid #dee2e6',
                      padding: 'clamp(2px, 0.5vw, 8px)',
                      width: `${columnWidths.location}px`,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                    onClick={() => handleCarClick(car._id)}
                  >
                    <span style={{ fontSize: 'clamp(10px, 1.2vw, 12px)' }}>{car.location || '-'}</span>
                  </td>
                  <td
                    style={{
                      border: '1px solid #dee2e6',
                      padding: 'clamp(2px, 0.5vw, 8px)',
                      width: `${columnWidths.status}px`,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                    onClick={() => handleCarClick(car._id)}
                  >
                    <span style={{ fontSize: 'clamp(10px, 1.2vw, 12px)' }}>{car.status || '-'}</span>
                  </td>
                  <td
                    style={{
                      border: '1px solid #dee2e6',
                      padding: 'clamp(2px, 0.5vw, 8px)',
                      width: `${columnWidths.next}px`,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                    onClick={() => handleCarClick(car._id)}
                  >
                    <span style={{ fontSize: 'clamp(10px, 1.2vw, 12px)' }}>
                      {car.next && car.next.length > 0 ? car.next.map(entry => entry.location).join(', ') : '-'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
};

export default CarSelectTable;