import React, { useState, useEffect, useCallback } from 'react';
import axios from '../../utils/axiosConfig';

const CustomerAndReconAppointments = () => {
  const [customerAppointments, setCustomerAppointments] = useState([]);
  const [reconAppointments, setReconAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Helper to parse dayTime strings for filtering
  const parseDayTime = (dayTime) => {
    if (!dayTime) return null;

    const dayTimeLower = dayTime.toLowerCase().trim();
    const now = new Date('2025-06-07T09:15:00+10:00'); // Current date and time: June 07, 2025, 09:15 AM AEST
    const today = new Date(now);
    today.setHours(0, 0, 0, 0); // Start of today: June 07, 2025, 00:00:00

    // Map of weekday names to their dates relative to today (Saturday, June 07, 2025)
    const weekdayMap = {
      'sat': 0, // Saturday (June 07, 2025)
      'saturday': 0,
      'sun': 1, // Sunday (June 08, 2025)
      'sunday': 1,
      'mon': 2, // Monday (June 09, 2025)
      'monday': 2,
      'tue': 3, // Tuesday (June 10, 2025)
      'tuesday': 3,
      'wed': 4, // Wednesday (June 11, 2025)
      'wednesday': 4,
      'thu': 5, // Thursday (June 12, 2025)
      'thursday': 5,
      'fri': 6, // Friday (June 13, 2025)
      'friday': 6,
    };

    // Check for "today" or phrases like "Could be today"
    if (dayTimeLower === 'today' || dayTimeLower.startsWith('could be today')) {
      const date = new Date(today);
      // Check for a time (e.g., "Could be today 11:30")
      const timeMatch = dayTimeLower.match(/(\d{1,2}(?::\d{2})?(?:am|pm)?)$/i);
      if (timeMatch) {
        const timeStr = timeMatch[1];
        let hours, minutes = 0;
        const isPM = timeStr.toLowerCase().includes('pm');
        const isAM = timeStr.toLowerCase().includes('am');
        const timeParts = timeStr.replace(/(am|pm)/i, '').split(':');
        hours = parseInt(timeParts[0], 10);
        if (timeParts[1]) minutes = parseInt(timeParts[1], 10);
        if (isPM && hours !== 12) hours += 12;
        if (isAM && hours === 12) hours = 0;
        date.setHours(hours, minutes, 0, 0);
      } else {
        date.setHours(0, 0, 0, 0); // Default to start of day if no time specified
      }
      return date;
    }

    // Check for weekday names (e.g., "Mon", "Wed", "Wednesday 12pm")
    const weekdayMatch = dayTimeLower.match(/^(mon|tue|wed|thu|fri|sat|sun|monday|tuesday|wednesday|thursday|friday|saturday|sunday)(\s+(\d{1,2}(?::\d{2})?(?:am|pm)?))?$/i);
    if (weekdayMatch) {
      const dayName = weekdayMatch[1].toLowerCase();
      const timeStr = weekdayMatch[3];
      const daysFromToday = weekdayMap[dayName];
      const date = new Date(today);
      date.setDate(today.getDate() + daysFromToday);

      if (timeStr) {
        let hours, minutes = 0;
        const isPM = timeStr.toLowerCase().includes('pm');
        const isAM = timeStr.toLowerCase().includes('am');
        const timeParts = timeStr.replace(/(am|pm)/i, '').split(':');
        hours = parseInt(timeParts[0], 10);
        if (timeParts[1]) minutes = parseInt(timeParts[1], 10);
        if (isPM && hours !== 12) hours += 12;
        if (isAM && hours === 12) hours = 0;
        date.setHours(hours, minutes, 0, 0);
      } else {
        date.setHours(0, 0, 0, 0); // Default to start of day if no time specified
      }
      return date;
    }

    // Try parsing as a standard date string
    const parsedDate = new Date(dayTime);
    if (!isNaN(parsedDate.getTime())) {
      return parsedDate;
    }

    return null; // Invalid date format
  };

  // Helper to format date and time (for Date Created)
  const formatDateTime = (date) => {
    const d = new Date(date);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = String(d.getFullYear()).slice(-2);
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${day}/${month}/${year} ${hours}:${minutes}`;
  };

  // Helper to format car details
  const formatCarDetails = (car, carDetails) => {
    if (car) {
      return `${car.make || '-'} ${car.model || ''}${car.badge ? ` ${car.badge}` : ''}${car.rego ? ` (Rego: ${car.rego})` : ''}`;
    }
    if (carDetails && (carDetails.make || carDetails.model)) {
      return `${carDetails.make || '-'} ${carDetails.model || ''}${carDetails.badge ? ` ${carDetails.badge}` : ''}${carDetails.rego ? ` (Rego: ${carDetails.rego})` : ''}`;
    }
    return '-';
  };

  const fetchAppointments = useCallback(async () => {
    try {
      // Fetch Customer Appointments
      const customerResponse = await axios.get('/api/customerappointments');
      const customerApps = customerResponse.data;

      // Fetch Reconditioning Appointments
      const reconResponse = await axios.get('/api/reconappointments');
      const reconApps = reconResponse.data;

      // Define today and tomorrow
      const now = new Date('2025-06-07T09:15:00+10:00'); // Current date and time: June 07, 2025, 09:15 AM AEST
      const todayStart = new Date(now);
      todayStart.setHours(0, 0, 0, 0); // Start of today: June 07, 2025, 00:00:00
      const todayEnd = new Date(now);
      todayEnd.setHours(23, 59, 59, 999); // End of today: June 07, 2025, 23:59:59
      const tomorrowStart = new Date(todayStart);
      tomorrowStart.setDate(todayStart.getDate() + 1); // Start of tomorrow: June 08, 2025, 00:00:00
      const tomorrowEnd = new Date(tomorrowStart);
      tomorrowEnd.setHours(23, 59, 59, 999); // End of tomorrow: June 08, 2025, 23:59:59

      // Filter Customer Appointments for today and tomorrow
      const filteredCustomerApps = customerApps.filter(app => {
        const appDate = parseDayTime(app.dayTime);
        if (!appDate) return false;
        return (appDate >= todayStart && appDate <= tomorrowEnd);
      });

      // Filter Reconditioning Appointments for today and tomorrow
      const filteredReconApps = reconApps.filter(app => {
        const appDate = parseDayTime(app.dayTime);
        if (!appDate) return false;
        return (appDate >= todayStart && appDate <= tomorrowEnd);
      });

      setCustomerAppointments(filteredCustomerApps);
      setReconAppointments(filteredReconApps);
      setLoading(false);
    } catch (err) {
      setError('Failed to fetch appointments: ' + err.message);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAppointments();
    const interval = setInterval(fetchAppointments, 10000); // Poll every 10 seconds
    return () => clearInterval(interval);
  }, [fetchAppointments]);

  return (
    <div style={{ marginTop: '20px' }}>
      {loading ? (
        <div style={{ textAlign: 'center', padding: '20px' }}>Loading...</div>
      ) : error ? (
        <div style={{ textAlign: 'center', padding: '20px', color: '#dc3545' }}>{error}</div>
      ) : (customerAppointments.length === 0 && reconAppointments.length === 0) ? (
        <div style={{ textAlign: 'center', padding: '20px', color: '#6c757d' }}>
          No customer or reconditioning appointments for today or tomorrow.
        </div>
      ) : (
        <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', justifyContent: 'center' }}>
          {/* Left Table: Customer Appointments */}
          <div style={{ flex: '1 1 45%', minWidth: '300px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#343a40', textAlign: 'center', marginBottom: '10px' }}>
              Customer Appointments (Today & Tomorrow)
            </h3>
            {customerAppointments.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '10px', color: '#6c757d' }}>
                No customer appointments for today or tomorrow.
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', backgroundColor: '#fff', borderRadius: '8px', overflow: 'hidden' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#e8ecef', height: '30px' }}>
                      <th style={{ padding: '6px', border: '1px solid #dee2e6', textAlign: 'left' }}>Name</th>
                      <th style={{ padding: '6px', border: '1px solid #dee2e6', textAlign: 'left' }}>Car</th>
                      <th style={{ padding: '6px', border: '1px solid #dee2e6', textAlign: 'left' }}>Comments</th>
                      <th style={{ padding: '6px', border: '1px solid #dee2e6', textAlign: 'left' }}>Day/Time</th>
                      <th style={{ padding: '6px', border: '1px solid #dee2e6', textAlign: 'left' }}>Created</th>
                    </tr>
                  </thead>
                  <tbody>
                    {customerAppointments.map(app => (
                      <tr key={app._id} style={{ height: '50px' }}>
                        <td style={{ padding: '6px', border: '1px solid #dee2e6', verticalAlign: 'middle' }}>
                          {app.name || '-'}
                        </td>
                        <td style={{ padding: '6px', border: '1px solid #dee2e6', verticalAlign: 'middle' }}>
                          {formatCarDetails(app.car, app.carDetails)}
                        </td>
                        <td style={{ padding: '6px', border: '1px solid #dee2e6', verticalAlign: 'middle' }}>
                          {app.comments || '-'}
                        </td>
                        <td style={{ padding: '6px', border: '1px solid #dee2e6', verticalAlign: 'middle' }}>
                          {app.dayTime || '-'}
                        </td>
                        <td style={{ padding: '6px', border: '1px solid #dee2e6', verticalAlign: 'middle' }}>
                          {app.dateCreated ? formatDateTime(app.dateCreated) : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Right Table: Reconditioning Appointments */}
          <div style={{ flex: '1 1 45%', minWidth: '300px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#343a40', textAlign: 'center', marginBottom: '10px' }}>
              Reconditioning Appointments (Today & Tomorrow)
            </h3>
            {reconAppointments.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '10px', color: '#6c757d' }}>
                No reconditioning appointments for today or tomorrow.
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', backgroundColor: '#fff', borderRadius: '8px', overflow: 'hidden' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#e8ecef', height: '30px' }}>
                      <th style={{ padding: '6px', border: '1px solid #dee2e6', textAlign: 'left' }}>Category</th>
                      <th style={{ padding: '6px', border: '1px solid #dee2e6', textAlign: 'left' }}>Name</th>
                      <th style={{ padding: '6px', border: '1px solid #dee2e6', textAlign: 'left' }}>Car</th>
                      <th style={{ padding: '6px', border: '1px solid #dee2e6', textAlign: 'left' }}>Comments</th>
                      <th style={{ padding: '6px', border: '1px solid #dee2e6', textAlign: 'left' }}>Day/Time</th>
                      <th style={{ padding: '6px', border: '1px solid #dee2e6', textAlign: 'left' }}>Created</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reconAppointments.map(app => (
                      <tr key={app._id} style={{ height: '50px' }}>
                        <td style={{ padding: '6px', border: '1px solid #dee2e6', verticalAlign: 'middle' }}>
                          {app.category || '-'}
                        </td>
                        <td style={{ padding: '6px', border: '1px solid #dee2e6', verticalAlign: 'middle' }}>
                          {app.reconditionerName || '-'}
                        </td>
                        <td style={{ padding: '6px', border: '1px solid #dee2e6', verticalAlign: 'middle' }}>
                          {formatCarDetails(app.carItems[0]?.car, app.carItems[0]?.carDetails)}
                        </td>
                        <td style={{ padding: '6px', border: '1px solid #dee2e6', verticalAlign: 'middle' }}>
                          {app.carItems[0]?.comment || '-'}
                        </td>
                        <td style={{ padding: '6px', border: '1px solid #dee2e6', verticalAlign: 'middle' }}>
                          {app.dayTime || '-'}
                        </td>
                        <td style={{ padding: '6px', border: '1px solid #dee2e6', verticalAlign: 'middle' }}>
                          {app.dateCreated ? formatDateTime(app.dateCreated) : '-'}
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

export default CustomerAndReconAppointments;