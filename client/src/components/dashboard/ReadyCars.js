import React, { useState, useEffect, useCallback } from 'react';
import axios from '../../utils/axiosConfig';

const ReadyCars = () => {
  const [readyCars, setReadyCars] = useState([]); // Green rows
  const [upcomingCars, setUpcomingCars] = useState([]); // Yellow rows
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchHighlightedCars = useCallback(async () => {
    try {
      const response = await axios.get('http://localhost:5000/api/cars');
      const cars = response.data;

      // Filter cars that would be highlighted
      const highlightedCars = cars.filter(car => {
        const status = car.status ? car.status.toLowerCase() : '';
        const now = new Date('2025-06-02T20:15:00+10:00'); // Current date and time: June 02, 2025, 08:15 PM AEST
        const today = new Date(now);
        today.setHours(0, 0, 0, 0); // Start of today

        // Helper to check if a time is today
        const isTimeToday = (status) => {
          const timeMatch = status.match(/^(?:at )?(\d{1,2}(?::\d{2})?(?:am|pm)?)$/i);
          if (!timeMatch) return false;
          const timeStr = timeMatch[1];
          let hours, minutes = 0;
          const isPM = timeStr.toLowerCase().includes('pm');
          const isAM = timeStr.toLowerCase().includes('am');
          const timeParts = timeStr.replace(/(am|pm)/i, '').split(':');
          hours = parseInt(timeParts[0], 10);
          if (timeParts[1]) minutes = parseInt(timeParts[1], 10);
          if (isPM && hours !== 12) hours += 12;
          if (isAM && hours === 12) hours = 0;
          const statusDate = new Date(now);
          statusDate.setHours(hours, minutes, 0, 0);
          const statusDay = new Date(statusDate);
          statusDay.setHours(0, 0, 0, 0);
          return statusDay.getTime() === today.getTime();
        };

        // Highlighted cars: "Ready", "later today", specific times, or future statuses
        return (
          status === 'ready' ||
          status === 'later today' ||
          status.includes('tomorrow') ||
          status.match(/^(?:at )?(\d{1,2}(?::\d{2})?(?:am|pm)?)$/i)
        );
      });

      // Split into ready (green) and upcoming (yellow) cars
      const ready = highlightedCars.filter(car => car.status && car.status.toLowerCase() === 'ready');
      const upcoming = highlightedCars.filter(car => car.status && car.status.toLowerCase() !== 'ready');

      setReadyCars(ready);
      setUpcomingCars(upcoming);
      setLoading(false);
    } catch (err) {
      setError('Failed to fetch cars: ' + err.message);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHighlightedCars();
    const interval = setInterval(fetchHighlightedCars, 10000); // Poll every 10 seconds
    return () => clearInterval(interval);
  }, [fetchHighlightedCars]);

  return (
    <div style={{ marginTop: '20px' }}>
      {loading ? (
        <div style={{ textAlign: 'center', padding: '20px' }}>Loading...</div>
      ) : error ? (
        <div style={{ textAlign: 'center', padding: '20px', color: '#dc3545' }}>{error}</div>
      ) : (readyCars.length === 0 && upcomingCars.length === 0) ? (
        <div style={{ textAlign: 'center', padding: '20px', color: '#6c757d' }}>
          No cars are ready or scheduled to be ready.
        </div>
      ) : (
        <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', justifyContent: 'center' }}>
          {/* Left Table: Ready Cars (Green) */}
          <div style={{ flex: '1 1 45%', minWidth: '300px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#343a40', textAlign: 'center', marginBottom: '10px' }}>
              Ready Cars
            </h3>
            {readyCars.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '10px', color: '#6c757d' }}>
                No cars are ready.
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', backgroundColor: '#fff', borderRadius: '8px', overflow: 'hidden' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#e8ecef', height: '30px' }}>
                      <th style={{ padding: '6px', border: '1px solid #dee2e6', textAlign: 'left' }}>Make</th>
                      <th style={{ padding: '6px', border: '1px solid #dee2e6', textAlign: 'left' }}>Model</th>
                      <th style={{ padding: '6px', border: '1px solid #dee2e6', textAlign: 'left' }}>Rego</th>
                      <th style={{ padding: '6px', border: '1px solid #dee2e6', textAlign: 'left' }}>Location</th>
                      <th style={{ padding: '6px', border: '1px solid #dee2e6', textAlign: 'left' }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {readyCars.map(car => (
                      <tr key={car._id} style={{ backgroundColor: '#e6f4ea', height: '50px' }}>
                        <td style={{ padding: '6px', border: '1px solid #dee2e6', verticalAlign: 'middle' }}>
                          {car.make || '-'}
                        </td>
                        <td style={{ padding: '6px', border: '1px solid #dee2e6', verticalAlign: 'middle' }}>
                          {car.model || '-'}
                        </td>
                        <td style={{ padding: '6px', border: '1px solid #dee2e6', verticalAlign: 'middle' }}>
                          {car.rego || '-'}
                        </td>
                        <td style={{ padding: '6px', border: '1px solid #dee2e6', verticalAlign: 'middle' }}>
                          {car.location || '-'}
                        </td>
                        <td style={{ padding: '6px', border: '1px solid #dee2e6', verticalAlign: 'middle' }}>
                          {car.status || '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Right Table: Upcoming Cars (Yellow) */}
          <div style={{ flex: '1 1 45%', minWidth: '300px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#343a40', textAlign: 'center', marginBottom: '10px' }}>
              Upcoming Cars
            </h3>
            {upcomingCars.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '10px', color: '#6c757d' }}>
                No cars are scheduled to be ready.
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', backgroundColor: '#fff', borderRadius: '8px', overflow: 'hidden' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#e8ecef', height: '30px' }}>
                      <th style={{ padding: '6px', border: '1px solid #dee2e6', textAlign: 'left' }}>Make</th>
                      <th style={{ padding: '6px', border: '1px solid #dee2e6', textAlign: 'left' }}>Model</th>
                      <th style={{ padding: '6px', border: '1px solid #dee2e6', textAlign: 'left' }}>Rego</th>
                      <th style={{ padding: '6px', border: '1px solid #dee2e6', textAlign: 'left' }}>Location</th>
                      <th style={{ padding: '6px', border: '1px solid #dee2e6', textAlign: 'left' }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {upcomingCars.map(car => (
                      <tr key={car._id} style={{ backgroundColor: '#fff3cd', height: '50px' }}>
                        <td style={{ padding: '6px', border: '1px solid #dee2e6', verticalAlign: 'middle' }}>
                          {car.make || '-'}
                        </td>
                        <td style={{ padding: '6px', border: '1px solid #dee2e6', verticalAlign: 'middle' }}>
                          {car.model || '-'}
                        </td>
                        <td style={{ padding: '6px', border: '1px solid #dee2e6', verticalAlign: 'middle' }}>
                          {car.rego || '-'}
                        </td>
                        <td style={{ padding: '6px', border: '1px solid #dee2e6', verticalAlign: 'middle' }}>
                          {car.location || '-'}
                        </td>
                        <td style={{ padding: '6px', border: '1px solid #dee2e6', verticalAlign: 'middle' }}>
                          {car.status || '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ReadyCars;