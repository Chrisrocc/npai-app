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
    const now = new Date();
    const today = new Date(now);
    today.setHours(0, 0, 0, 0); // Start of today

    // Dynamically generate weekdayMap based on today's date
    const todayDay = today.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
    const weekdayMap = {
      [todayDay]: 0, // Today
      [new Date(today.setDate(today.getDate() + 1)).toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase()]: 1, // Tomorrow
      [new Date(today.setDate(today.getDate() + 1)).toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase()]: 2, // Day after tomorrow
      [new Date(today.setDate(today.getDate() + 2)).toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase()]: 3,
      [new Date(today.setDate(today.getDate() + 3)).toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase()]: 4,
      [new Date(today.setDate(today.getDate() + 4)).toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase()]: 5,
      [new Date(today.setDate(today.getDate() + 5)).toLowerCase()]: 6,
    };

    // Map common abbreviations to full names
    const abbreviationMap = {
      'thu': 'thursday', 'thurs': 'thursday', 'fri': 'friday', 'sat': 'saturday',
      'sun': 'sunday', 'mon': 'monday', 'tue': 'tuesday', 'wed': 'wednesday'
    };

    // Check for "today" or phrases like "Could be today"
    if (dayTimeLower === 'today' || dayTimeLower.startsWith('could be today')) {
      const date = new Date(today);
      const timeMatch = dayTimeLower.match(/(\d{1,2}(?::\d{2})?(?:am|pm|a\.m\.|p\.m\.)?)$/i);
      if (timeMatch) {
        const timeStr = timeMatch[1];
        let hours, minutes = 0;
        const isPM = timeStr.toLowerCase().includes('pm') || timeStr.toLowerCase().includes('p.m.');
        const isAM = timeStr.toLowerCase().includes('am') || timeStr.toLowerCase().includes('a.m.');
        const timeParts = timeStr.replace(/(am|pm|a\.m\.|p\.m\.)/i, '').split(':');
        hours = parseInt(timeParts[0], 10) || 0;
        if (timeParts[1]) minutes = parseInt(timeParts[1], 10) || 0;
        if (isPM && hours !== 12) hours += 12;
        if (isAM && hours === 12) hours = 0;
        date.setHours(hours, minutes, 0, 0);
      } else {
        date.setHours(0, 0, 0, 0);
      }
      return date;
    }

    // Check for weekday names (e.g., "Thur", "Fri", "Friday 12pm", "friday a.m.")
    const weekdayMatch = dayTimeLower.match(/^(mon|tue|wed|thu|fri|sat|sun|monday|tuesday|wednesday|thursday|friday|saturday|sunday|thurs)(?:\s*(\d{1,2}(?::\d{2})?(?:am|pm|a\.m\.|p\.m\.)?)?)$/i);
    if (weekdayMatch) {
      const dayName = abbreviationMap[weekdayMatch[1].toLowerCase()] || weekdayMatch[1].toLowerCase();
      const timeStr = weekdayMatch[2];
      const daysFromToday = weekdayMap[dayName] !== undefined ? weekdayMap[dayName] : 0; // Default to today if not found
      const date = new Date(today);
      date.setDate(today.getDate() + daysFromToday);

      if (timeStr) {
        let hours, minutes = 0;
        const isPM = timeStr.toLowerCase().includes('pm') || timeStr.toLowerCase().includes('p.m.');
        const isAM = timeStr.toLowerCase().includes('am') || timeStr.toLowerCase().includes('a.m.');
        const timeParts = timeStr.replace(/(am|pm|a\.m\.|p\.m\.)/i, '').split(':');
        hours = parseInt(timeParts[0], 10) || 0;
        if (timeParts[1]) minutes = parseInt(timeParts[1], 10) || 0;
        if (isPM && hours !== 12) hours += 12;
        if (isAM && hours === 12) hours = 0;
        date.setHours(hours, minutes, 0, 0);
      } else {
        date.setHours(0, 0, 0, 0);
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

  // Color logic from ReconAppointments
  const getAppointmentRowColor = (dayTime) => {
    if (!dayTime) return 'transparent';
    const dayTimeLower = dayTime.toLowerCase();
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    const todayDayFull = today.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
    const todayDayShort = today.toLocaleDateString('en-US', { weekday: 'short' }).toLowerCase();
    const tomorrowDayFull = tomorrow.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
    const tomorrowDayShort = tomorrow.toLocaleDateString('en-US', { weekday: 'short' }).toLowerCase();

    const todayDateStr = `${todayDayShort} ${today.getDate()}${getOrdinalSuffix(today.getDate())}`.toLowerCase();
    const tomorrowDateStr = `${tomorrowDayShort} ${tomorrow.getDate()}${getOrdinalSuffix(tomorrow.getDate())}`.toLowerCase();

    const hasToday = dayTimeLower.includes('today');
    const isTodayDay = dayTimeLower.includes(todayDayFull) || dayTimeLower.includes(todayDayShort);
    const isTodayDate = dayTimeLower.includes(todayDateStr);
    const isTimeOnly = /^(?:\d{1,2}(?::\d{2})?(?:am|pm|a\.m\.|p\.m\.)?)$/i.test(dayTimeLower);

    if (hasToday || isTodayDay || isTodayDate || isTimeOnly) {
      return '#e6f4ea';
    }

    const hasTomorrow = dayTimeLower.includes('tomorrow');
    const isTomorrowDay = dayTimeLower.includes(tomorrowDayFull) || dayTimeLower.includes(tomorrowDayShort);
    const isTomorrowDate = dayTimeLower.includes(tomorrowDateStr);

    if (hasTomorrow || isTomorrowDay || isTomorrowDate) {
      return '#fff4e6';
    }

    return 'transparent';
  };

  const getOrdinalSuffix = (day) => {
    if (day % 10 === 1 && day !== 11) return 'st';
    if (day % 10 === 2 && day !== 12) return 'nd';
    if (day % 10 === 3 && day !== 13) return 'rd';
    return 'th';
  };

  const fetchAppointments = useCallback(async () => {
    try {
      // Fetch Customer Appointments
      const customerResponse = await axios.get('/api/customerappointments');
      const customerApps = customerResponse.data;

      // Fetch Reconditioning Appointments
      const reconResponse = await axios.get('/api/reconappointments');
      let reconApps = reconResponse.data;

      // Filter Reconditioner Appointments for green (#e6f4ea) or yellow (#fff4e6)
      reconApps = reconApps.filter(app => {
        const color = getAppointmentRowColor(app.dayTime);
        return color === '#e6f4ea' || color === '#fff4e6';
      });

      // Define today and tomorrow
      const now = new Date(); // Current date and time: June 19, 2025, 04:58 PM AEST
      const todayStart = new Date(now);
      todayStart.setHours(0, 0, 0, 0); // Start of today: June 19, 2025, 00:00:00
      const todayEnd = new Date(now);
      todayEnd.setHours(23, 59, 59, 999); // End of today: June 19, 2025, 23:59:59
      const tomorrowStart = new Date(todayStart);
      tomorrowStart.setDate(todayStart.getDate() + 1); // Start of tomorrow: June 20, 2025, 00:00:00
      const tomorrowEnd = new Date(tomorrowStart);
      tomorrowEnd.setHours(23, 59, 59, 999); // End of tomorrow: June 20, 2025, 23:59:59

      // Filter Customer Appointments for today and tomorrow
      const filteredCustomerApps = customerApps.filter(app => {
        const appDate = parseDayTime(app.dayTime);
        return appDate ? (appDate >= todayStart && appDate <= tomorrowEnd) : false;
      });

      // Filter and sort Recon Appointments
      reconApps = reconApps.filter(app => {
        const appDate = parseDayTime(app.dayTime);
        const color = getAppointmentRowColor(app.dayTime);
        return (appDate && appDate >= todayStart && appDate <= tomorrowEnd) || color === '#e6f4ea' || color === '#fff4e6';
      }).sort((a, b) => {
        const aColor = getAppointmentRowColor(a.dayTime);
        const bColor = getAppointmentRowColor(b.dayTime);
        if (aColor === '#e6f4ea' && bColor !== '#e6f4ea') return -1; // Green first
        if (aColor !== '#e6f4ea' && bColor === '#e6f4ea') return 1;  // Green first
        const aDate = parseDayTime(a.dayTime) || new Date(0);
        const bDate = parseDayTime(b.dayTime) || new Date(0);
        return aDate - bDate; // Secondary sort by date within same color
      });

      setCustomerAppointments(filteredCustomerApps);
      setReconAppointments(reconApps);
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
                      <tr key={app._id} style={{ height: '50px', backgroundColor: getAppointmentRowColor(app.dayTime) }}>
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
                      <tr key={app._id} style={{ height: '50px', backgroundColor: getAppointmentRowColor(app.dayTime) }}>
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