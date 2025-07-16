import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from '../../utils/axiosConfig';
import HamburgerMenu from '../shared/HamburgerMenu';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import CarSelectTable from '../shared/CarSelectTable';

const ReconAppointments = () => {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showCarSelectModal, setShowCarSelectModal] = useState(false);
  const [modalCategory, setModalCategory] = useState(null);
  const [newAppointment, setNewAppointment] = useState({
    reconditionerName: '',
    dayTime: '',
    carItems: [],
  });
  const [editingField, setEditingField] = useState(null); // { rowKey, appointmentId, field, carItemId, value }
  const [isEditingActive, setIsEditingActive] = useState(false);
  const navigate = useNavigate();
  const categories = [
    'dents',
    'auto electrical',
    'interior minor',
    'battery',
    'A/C',
    'Windscreen',
    'Tint',
    'Touch Up',
    'wheels',
    'Mechanic',
    'Body',
    'Interior Major',
    'other',
  ];

  // Fetch appointments
  const fetchAppointments = useCallback(async () => {
    try {
      console.log('Fetching appointments...');
      const response = await axios.get('/api/reconappointments');
      console.log('Appointments response:', response.data);
      if (!Array.isArray(response.data)) {
        throw new Error('Expected an array of appointments, but received: ' + JSON.stringify(response.data));
      }
      setAppointments(response.data);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching appointments:', err);
      if (err.response?.status === 401 || err.response?.status === 403) {
        navigate('/login');
      } else {
        setError('Failed to fetch appointments: ' + err.message);
        setLoading(false);
      }
    }
  }, [navigate]);

  useEffect(() => {
    fetchAppointments();
    const interval = setInterval(fetchAppointments, 10000);
    return () => clearInterval(interval);
  }, [fetchAppointments]);

  // Add new appointments (one per car)
  const handleAddAppointment = async (e) => {
    e.preventDefault();
    try {
      console.log('Adding new appointments:', newAppointment);
      // Create a separate appointment for each car
      for (const item of newAppointment.carItems) {
        const appointmentData = {
          reconditionerName: newAppointment.reconditionerName,
          dayTime: newAppointment.dayTime,
          carItems: [{
            car: item.carId || null,
            carDetails: item.carId ? {} : { make: '', model: '', badge: '', rego: '', description: '' },
            comment: item.comment || '',
          }],
          category: modalCategory || 'other',
        };
        console.log('Sending appointment data for car:', appointmentData);
        const response = await axios.post('/api/reconappointments', appointmentData);
        console.log('Add appointment response:', response.data);
      }
      setNewAppointment({ reconditionerName: '', dayTime: '', carItems: [] });
      setModalCategory(null);
      setShowAddModal(false);
      setShowCarSelectModal(false);
      fetchAppointments();
    } catch (err) {
      console.error('Error adding appointments:', err);
      if (err.response?.status === 401 || err.response?.status === 403) {
        navigate('/login');
      } else {
        alert('Failed to add appointments: ' + err.message);
      }
    }
  };

  // Start editing
  const startEditing = (rowKey, appointmentId, field, carItemId, value) => {
    console.log('Starting edit:', { rowKey, appointmentId, field, carItemId, value });
    setEditingField({ rowKey, appointmentId, field, carItemId, value });
    setIsEditingActive(false);
    setTimeout(() => {
      setIsEditingActive(true);
    }, 200);
    if (field === 'car') {
      setShowCarSelectModal(true);
    }
  };

  // Handle edit input changes
  const handleEditChange = (e) => {
    setEditingField((prev) => ({ ...prev, value: e.target.value }));
  };

  // Save edit
  const saveEdit = async () => {
    if (!editingField) return;
    const { rowKey, appointmentId, field, carItemId, value } = editingField;
    try {
      const appointment = appointments.find((app) => app._id === appointmentId);
      if (!appointment) throw new Error('Appointment not found');

      const updateData = {
        reconditionerName: appointment.reconditionerName || '',
        dayTime: appointment.dayTime || '',
        category: appointment.category || 'other',
        carItems: appointment.carItems.map((item) => ({
          _id: item._id,
          car: item.car ? (typeof item.car === 'object' ? item.car._id : item.car) : null,
          carDetails: item.carDetails || {},
          comment: item.comment || '',
        })),
      };

      if (field === 'reconditionerName') {
        updateData.reconditionerName = value;
      } else if (field === 'dayTime') {
        updateData.dayTime = value;
      } else if (field === 'comments' && carItemId) {
        const index = updateData.carItems.findIndex((item) => item._id === carItemId);
        if (index === -1) throw new Error('Car item not found');
        updateData.carItems[index].comment = value;
      } else if (field === 'car' && carItemId) {
        const index = updateData.carItems.findIndex((item) => item._id === carItemId);
        if (index === -1) throw new Error('Car item not found');
        updateData.carItems[index].car = value;
        updateData.carItems[index].carDetails = {};
      }

      console.log('Updating appointment:', updateData);
      const response = await axios.put(`/api/reconappointments/${appointmentId}`, updateData);
      console.log('Update response:', response.data);
      setEditingField(null);
      setIsEditingActive(false);
      setShowCarSelectModal(false);
      fetchAppointments();
    } catch (err) {
      console.error('Error updating appointment:', err);
      if (err.response?.status === 401 || err.response?.status === 403) {
        navigate('/login');
      } else {
        alert('Failed to update appointment: ' + err.message);
      }
    }
  };

  // Cancel editing
  const cancelEdit = () => {
    console.log('Cancelling edit');
    setEditingField(null);
    setIsEditingActive(false);
    setShowCarSelectModal(false);
  };

  // Delete entire appointment
  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this appointment?')) return;
    try {
      console.log('Deleting appointment:', id);
      const response = await axios.delete(`/api/reconappointments/${id}`);
      console.log('Delete response:', response.data);
      fetchAppointments();
    } catch (err) {
      console.error('Error deleting appointment:', err);
      if (err.response?.status === 401 || err.response?.status === 403) {
        navigate('/login');
      } else {
        alert('Failed to delete appointment: ' + err.message);
      }
    }
  };

  // Delete a specific car item from an appointment
  const handleDeleteCarItem = async (appointmentId, carItemId) => {
    if (!window.confirm('Are you sure you want to remove this car from the appointment?')) return;
    try {
      console.log('Deleting car item:', { appointmentId, carItemId });
      const appointment = appointments.find((app) => app._id === appointmentId);
      if (!appointment) throw new Error('Appointment not found');

      const updatedCarItems = appointment.carItems.filter((item) => item._id !== carItemId);
      const updateData = {
        reconditionerName: appointment.reconditionerName || '',
        dayTime: appointment.dayTime || '',
        category: appointment.category || 'other',
        carItems: updatedCarItems.map((item) => ({
          _id: item._id,
          car: item.car ? (typeof item.car === 'object' ? item.car._id : item.car) : null,
          carDetails: item.carDetails || {},
          comment: item.comment || '',
        })),
      };

      console.log('Updating appointment after car item deletion:', updateData);
      const response = await axios.put(`/api/reconappointments/${appointmentId}`, updateData);
      console.log('Update response:', response.data);

      // If no car items remain, delete the appointment
      if (updatedCarItems.length === 0) {
        await axios.delete(`/api/reconappointments/${appointmentId}`);
        console.log('Deleted appointment as no car items remain');
      }

      fetchAppointments();
    } catch (err) {
      console.error('Error deleting car item:', err);
      if (err.response?.status === 401 || err.response?.status === 403) {
        navigate('/login');
      } else {
        alert('Failed to delete car item: ' + err.message);
      }
    }
  };

  // Fetch car details for a list of car IDs
  const fetchCarDetails = async (carIds) => {
    try {
      const carDetails = [];
      for (const carId of carIds) {
        const response = await axios.get(`/api/cars/${carId}`);
        const car = response.data;
        carDetails.push({
          carId,
          make: car.make || '',
          model: car.model || '',
          badge: car.badge || '',
          rego: car.rego || '',
          location: car.location || '',
          status: car.status || '',
        });
      }
      return carDetails;
    } catch (err) {
      console.error('Error fetching car details:', err);
      alert('Failed to fetch car details: ' + err.message);
      return carIds.map((carId) => ({
        carId,
        make: '',
        model: '',
        badge: '',
        rego: '',
        location: '',
        status: '',
      }));
    }
  };

  // Handle car selection
  const handleSelectCar = async (carIds) => {
    console.log('Selected car IDs:', carIds);
    if (editingField && editingField.field === 'car') {
      // Single car selection for editing
      try {
        const appointment = appointments.find((app) => app._id === editingField.appointmentId);
        if (!appointment) throw new Error('Appointment not found');
        const updateData = {
          reconditionerName: appointment.reconditionerName || '',
          dayTime: appointment.dayTime || '',
          category: appointment.category || 'other',
          carItems: appointment.carItems.map((item) => ({
            _id: item._id,
            car: item._id === editingField.carItemId ? carIds[0] : (item.car ? (typeof item.car === 'object' ? item.car._id : item.car) : null),
            carDetails: item._id === editingField.carItemId ? {} : (item.carDetails || {}),
            comment: item.comment || '',
          })),
        };
        console.log('Updating appointment with new car:', updateData);
        const response = await axios.put(`/api/reconappointments/${editingField.appointmentId}`, updateData);
        console.log('Update response:', response.data);
        setEditingField(null);
        setIsEditingActive(false);
        setShowCarSelectModal(false);
        fetchAppointments();
      } catch (err) {
        console.error('Error updating car:', err);
        if (err.response?.status === 401 || err.response?.status === 403) {
          navigate('/login');
        } else {
          alert('Failed to update car: ' + err.message);
        }
      }
    } else {
      // Multiple car selection for adding
      const carDetails = await fetchCarDetails(carIds);
      setNewAppointment((prev) => {
        const existingCarIds = new Set(prev.carItems.map((item) => item.carId));
        const newCarItems = carDetails
          .filter((car) => !existingCarIds.has(car.carId))
          .map((car) => ({
            carId: car.carId,
            make: car.make,
            model: car.model,
            badge: car.badge,
            rego: car.rego,
            location: car.location,
            status: car.status,
            comment: '',
          }));
        return {
          ...prev,
          carItems: [...prev.carItems, ...newCarItems],
        };
      });
      // Do not close the add modal after selecting cars
      setShowCarSelectModal(false);
    }
  };

  // Update car comment for new appointment
  const handleCarCommentChange = (carId, comment) => {
    setNewAppointment((prev) => ({
      ...prev,
      carItems: prev.carItems.map((item) =>
        item.carId === carId ? { ...item, comment } : item
      ),
    }));
  };

  // Remove car from new appointment
  const handleRemoveCar = (carId) => {
    setNewAppointment((prev) => ({
      ...prev,
      carItems: prev.carItems.filter((item) => item.carId !== carId),
    }));
  };

  // Row background color
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
    const isTimeOnly = /^(?:\d{1,2}(?::\d{2})?(?:pm|am)?)$/i.test(dayTimeLower);

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

  // Render category table
  const renderCategoryTable = (category) => {
    const filteredAppointments = appointments.filter((app) => app.category === category);
    // Each appointment should have exactly one car in carItems
    const rows = filteredAppointments.map((app) => {
      const item = app.carItems[0]; // There should only be one item per appointment
      return {
        ...app,
        car: item.car,
        carDetails: item.carDetails,
        comment: item.comment,
        carItemId: item._id,
        rowKey: app._id, // Use appointment ID as rowKey since each appointment is unique
      };
    });

    return (
      <div key={category} style={{ flex: '1 1 33%', padding: '10px', boxSizing: 'border-box' }}>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '10px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: '600', color: '#343a40', margin: 0, flexGrow: 1 }}>
            {category.charAt(0).toUpperCase() + category.slice(1)}
          </h2>
          <button
            onClick={() => {
              setModalCategory(category);
              setNewAppointment({ reconditionerName: '', dayTime: '', carItems: [] });
              setShowAddModal(true);
            }}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontSize: '18px',
              color: '#007bff',
              transition: 'color 0.2s',
            }}
            onMouseEnter={(e) => (e.target.style.color = '#0056b3')}
            onMouseLeave={(e) => (e.target.style.color = '#007bff')}
          >
            ➕
          </button>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse', backgroundColor: '#fff', borderRadius: '8px', overflow: 'hidden' }}>
          <thead>
            <tr style={{ backgroundColor: '#e8ecef', height: '30px' }}>
              <th style={{ padding: '6px', border: '1px solid #dee2e6', textAlign: 'left' }}>Name</th>
              <th style={{ padding: '6px', border: '1px solid #dee2e6', textAlign: 'left' }}>Day/Time</th>
              <th style={{ padding: '6px', border: '1px solid #dee2e6', textAlign: 'left' }}>Car</th>
              <th style={{ padding: '6px', border: '1px solid #dee2e6', textAlign: 'left' }}>Comment</th>
              <th style={{ padding: '6px', border: '1px solid #dee2e6', textAlign: 'left' }}>Date Created</th>
              <th style={{ padding: '6px', border: '1px solid #dee2e6', textAlign: 'left' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={row.rowKey}
                style={{
                  backgroundColor: getAppointmentRowColor(row.dayTime),
                  transition: 'background-color 0.2s',
                  height: '50px',
                }}
              >
                <td
                  style={{ padding: '6px', border: '1px solid #dee2e6', verticalAlign: 'middle' }}
                  onDoubleClick={() => {
                    if (!editingField) {
                      startEditing(row.rowKey, row._id, 'reconditionerName', null, row.reconditionerName);
                    }
                  }}
                >
                  {editingField?.rowKey === row.rowKey && editingField?.field === 'reconditionerName' ? (
                    <input
                      type="text"
                      value={editingField.value}
                      onChange={handleEditChange}
                      onBlur={() => isEditingActive && saveEdit()}
                      onKeyPress={(e) => e.key === 'Enter' && saveEdit()}
                      onKeyDown={(e) => e.key === 'Escape' && cancelEdit()}
                      autoFocus
                      style={{ width: '100%', padding: '4px', border: '1px solid #ced4da', borderRadius: '4px' }}
                    />
                  ) : (
                    row.reconditionerName || '-'
                  )}
                </td>
                <td
                  style={{ padding: '6px', border: '1px solid #dee2e6', verticalAlign: 'middle' }}
                  onDoubleClick={() => {
                    if (!editingField) {
                      startEditing(row.rowKey, row._id, 'dayTime', null, row.dayTime);
                    }
                  }}
                >
                  {editingField?.rowKey === row.rowKey && editingField?.field === 'dayTime' ? (
                    <input
                      type="text"
                      value={editingField.value}
                      onChange={handleEditChange}
                      onBlur={() => isEditingActive && saveEdit()}
                      onKeyPress={(e) => e.key === 'Enter' && saveEdit()}
                      onKeyDown={(e) => e.key === 'Escape' && cancelEdit()}
                      autoFocus
                      style={{ width: '100%', padding: '4px', border: '1px solid #ced4da', borderRadius: '4px' }}
                    />
                  ) : (
                    row.dayTime || '-'
                  )}
                </td>
                <td
                  style={{ padding: '6px', border: '1px solid #dee2e6', minWidth: '300px', verticalAlign: 'middle' }}
                  onDoubleClick={() => {
                    if (!editingField) {
                      startEditing(row.rowKey, row._id, 'car', row.carItemId, row.car ? row.car._id : null);
                    }
                  }}
                >
                  {editingField?.rowKey === row.rowKey &&
                  editingField?.field === 'car' &&
                  editingField?.carItemId === row.carItemId ? (
                    <div>Selecting car...</div>
                  ) : row.car ? (
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                      <div style={{ flexShrink: '0' }}>
                        {row.car.photos && row.car.photos.length > 0 ? (
                          <img
                            src={`${process.env.REACT_APP_API_URL}/${row.car.photos[0]}`}
                            alt={`Car ${row.car.rego}`}
                            style={{ width: '60px', height: '40px', objectFit: 'cover', borderRadius: '4px' }}
                            onError={(e) => (e.target.style.display = 'none')}
                          />
                        ) : (
                          <span style={{ display: 'inline-block', width: '60px', height: '40px' }}></span>
                        )}
                      </div>
                      <div style={{ flexGrow: 1, marginLeft: '0px' }}>
                        <div style={{ fontSize: '14px', fontWeight: '500', lineHeight: '1.2' }}>
                          {`${row.car.make || '-'} ${row.car.model || ''}${row.car.badge ? ` ${row.car.badge}` : ''}`.trim()}
                        </div>
                        <div style={{ fontSize: '12px', color: '#495057', lineHeight: '1.2' }}>
                          <span>Rego: {row.car.rego || '-'}</span>
                          <span style={{ marginLeft: '10px' }}>
                            Location: <span style={{ color: row.car.location && row.car.location.toLowerCase() !== 'northpoint' ? 'red' : '#495057' }}>{row.car.location || '-'}</span>
                          </span>
                          <span style={{ marginLeft: '10px' }}>
                            Status: {row.car.status || '-'}
                          </span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div>
                      {row.carDetails && (row.carDetails.make || row.carDetails.model) ? (
                        <div style={{ fontSize: '14px', fontWeight: '500' }}>
                          {`${row.carDetails.make || '-'} ${row.carDetails.model || ''}`.trim()}
                          {row.carDetails.badge && ` ${row.carDetails.badge}`}
                          {row.carDetails.rego && ` ${row.carDetails.rego}`}
                        </div>
                      ) : (
                        '-'
                      )}
                    </div>
                  )}
                </td>
                <td
                  style={{ padding: '6px', border: '1px solid #dee2e6', verticalAlign: 'middle' }}
                  onDoubleClick={() => {
                    if (!editingField) {
                      startEditing(row.rowKey, row._id, 'comments', row.carItemId, row.comment);
                    }
                  }}
                >
                  {editingField?.rowKey === row.rowKey &&
                  editingField?.field === 'comments' &&
                  editingField?.carItemId === row.carItemId ? (
                    <textarea
                      value={editingField.value}
                      onChange={handleEditChange}
                      onBlur={() => isEditingActive && saveEdit()}
                      onKeyPress={(e) => e.key === 'Enter' && saveEdit()}
                      onKeyDown={(e) => e.key === 'Escape' && cancelEdit()}
                      autoFocus
                      style={{ width: '100%', padding: '4px', border: '1px solid #ced4da', borderRadius: '4px', minHeight: '40px' }}
                    />
                  ) : (
                    row.comment || '-'
                  )}
                </td>
                <td style={{ padding: '6px', border: '1px solid #dee2e6', verticalAlign: 'middle' }}>
                  {new Date(row.dateCreated).toLocaleDateString()}
                </td>
                <td style={{ padding: '6px', border: '1px solid #dee2e6', width: '50px', textAlign: 'center', verticalAlign: 'middle' }}>
                  <button
                    onClick={() => handleDelete(row._id)} // Delete the entire appointment (which now has only one car)
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
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  if (loading) return <div style={{ textAlign: 'center', padding: '20px' }}>Loading...</div>;
  if (error) return <div style={{ textAlign: 'center', padding: '20px', color: '#dc3545' }}>{error}</div>;

  return (
    <DndProvider backend={HTML5Backend}>
      <div style={{ padding: '20px', fontFamily: "'Roboto', sans-serif", backgroundColor: '#fff', minHeight: '100vh' }}>
        <HamburgerMenu />
        <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#343a40', textAlign: 'center', marginBottom: '20px' }}>
          Reconditioner Appointments
        </h1>

        {showAddModal && (
          <div
            style={{
              position: 'fixed',
              top: '0',
              left: '0',
              width: '100%',
              height: '100%',
              backgroundColor: 'rgba(0, 0, 0, 0.6)',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              zIndex: '1000',
            }}
            onClick={() => {
              if (!showCarSelectModal) {
                setShowAddModal(false);
              }
            }}
          >
            <div
              style={{
                backgroundColor: 'white',
                padding: '20px',
                borderRadius: '8px',
                width: '500px',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                maxHeight: '80vh',
                overflowY: 'auto',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <h2 style={{ fontSize: '18px', marginBottom: '15px' }}>
                Add New Reconditioner Appointment ({modalCategory})
              </h2>
              <form onSubmit={handleAddAppointment}>
                <div style={{ marginBottom: '10px' }}>
                  <label style={{ display: 'block', marginBottom: '5px' }}>Name</label>
                  <input
                    type="text"
                    value={newAppointment.reconditionerName}
                    onChange={(e) => setNewAppointment({ ...newAppointment, reconditionerName: e.target.value })}
                    style={{ width: '100%', padding: '8px', border: '1px solid #ced4da', borderRadius: '4px' }}
                  />
                </div>
                <div style={{ marginBottom: '10px' }}>
                  <label style={{ display: 'block', marginBottom: '5px' }}>Day/Time</label>
                  <input
                    type="text"
                    value={newAppointment.dayTime}
                    onChange={(e) => setNewAppointment({ ...newAppointment, dayTime: e.target.value })}
                    style={{ width: '100%', padding: '8px', border: '1px solid #ced4da', borderRadius: '4px' }}
                  />
                </div>
                <div style={{ marginBottom: '10px' }}>
                  <label style={{ display: 'block', marginBottom: '5px' }}>Cars</label>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      setShowCarSelectModal(true);
                    }}
                    style={{
                      padding: '8px 12px',
                      backgroundColor: '#007bff',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      width: '100%',
                      textAlign: 'center',
                      marginBottom: '10px',
                    }}
                  >
                    Select Cars ({newAppointment.carItems.length} selected)
                  </button>
                  {newAppointment.carItems.length > 0 ? (
                    newAppointment.carItems.map((item, index) => (
                      <div
                        key={item.carId}
                        style={{
                          marginBottom: '10px',
                          border: '1px solid #dee2e6',
                          padding: '8px',
                          borderRadius: '4px',
                          position: 'relative',
                        }}
                      >
                        <div style={{ fontSize: '14px', fontWeight: '500', marginBottom: '5px' }}>
                          {`${item.make || '-'} ${item.model || ''}${item.badge ? ` ${item.badge}` : ''}`.trim()}
                        </div>
                        <div style={{ fontSize: '12px', color: '#495057' }}>
                          Rego: {item.rego || '-'}
                        </div>
                        <div style={{ fontSize: '12px', color: '#495057' }}>
                          Location: <span style={{ color: item.location && item.location.toLowerCase() !== 'northpoint' ? 'red' : '#495057' }}>{item.location || '-'}</span>
                        </div>
                        <div style={{ fontSize: '12px', color: '#495057', marginBottom: '5px' }}>
                          Status: {item.status || '-'}
                        </div>
                        <textarea
                          value={item.comment}
                          onChange={(e) => handleCarCommentChange(item.carId, e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && e.preventDefault()}
                          placeholder="Comment for this car"
                          style={{
                            width: '100%',
                            padding: '8px',
                            border: '1px solid #ced4da',
                            borderRadius: '4px',
                            minHeight: '60px',
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => handleRemoveCar(item.carId)}
                          style={{
                            position: 'absolute',
                            top: '8px',
                            right: '8px',
                            background: 'none',
                            border: 'none',
                            color: '#dc3545',
                            cursor: 'pointer',
                          }}
                        >
                          ✕
                        </button>
                      </div>
                    ))
                  ) : (
                    <div style={{ color: '#6c757d', fontSize: '14px', marginBottom: '10px' }}>
                      No cars selected.
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    type="submit"
                    style={{
                      padding: '8px 16px',
                      backgroundColor: '#28a745',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                    }}
                  >
                    Add
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddModal(false);
                      setShowCarSelectModal(false);
                    }}
                    style={{
                      padding: '8px 16px',
                      backgroundColor: '#6c757d',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {showCarSelectModal && (
          <div
            style={{
              position: 'fixed',
              top: '0',
              left: '0',
              width: '100%',
              height: '100%',
              backgroundColor: 'rgba(0, 0, 0, 0.6)',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              zIndex: '1001',
            }}
            onClick={() => setShowCarSelectModal(false)}
          >
            <div
              style={{
                backgroundColor: '#fff',
                padding: '20px',
                borderRadius: '8px',
                width: '90%',
                maxWidth: '1200px',
                maxHeight: '80vh',
                overflowY: 'auto',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <h2 style={{ fontSize: '18px', marginBottom: '15px' }}>
                {showAddModal ? 'Select Cars' : 'Select a Car'}
              </h2>
              <CarSelectTable
                onSelectCar={handleSelectCar}
                onClose={() => setShowCarSelectModal(false)}
                multiSelect={showAddModal}
                selectedCarIds={showAddModal ? newAppointment.carItems.map((item) => item.carId) : []}
              />
              <button
                onClick={() => setShowCarSelectModal(false)}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#6c757d',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  marginTop: '10px',
                }}
              >
                Close
              </button>
            </div>
          </div>
        )}

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px' }}>
          {categories.map((category) => renderCategoryTable(category))}
        </div>
      </div>
    </DndProvider>
  );
};

export default ReconAppointments;