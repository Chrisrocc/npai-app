import React, { useState, useEffect, useCallback, useRef } from 'react';
import axios from '../../utils/axiosConfig';
import HamburgerMenu from '../shared/HamburgerMenu';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { useNavigate } from 'react-router-dom';
import CarSelectTable from '../shared/CarSelectTable';

const CustomerAppointments = () => {
  const [customerAppointments, setCustomerAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showCarSelectModal, setShowCarSelectModal] = useState(false);
  const [newAppointment, setNewAppointment] = useState({
    name: '',
    dayTime: '',
    car: null,
    comments: ''
  });
  const [editingField, setEditingField] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [editAppointmentId, setEditAppointmentId] = useState(null);
  const [editCarItemId, setEditCarItemId] = useState(null);
  const [sourceFilter, setSourceFilter] = useState('all');
  const navigate = useNavigate();

  const fetchCustomerAppointments = useCallback(async () => {
    try {
      console.log('Fetching customer appointments from http://localhost:5000/api/customerappointments...');
      const response = await axios.get('http://localhost:5000/api/customerappointments');
      console.log('Customer appointments response:', response.data);
      if (!Array.isArray(response.data)) {
        throw new Error('Expected an array of appointments, but received: ' + JSON.stringify(response.data));
      }
      setCustomerAppointments(response.data);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching customer appointments:', err);
      if (err.response?.status === 401 || err.response?.status === 403) {
        navigate('/login');
      } else {
        setError('Failed to fetch customer appointments: ' + err.message);
        setLoading(false);
      }
    }
  }, [navigate]);

  useEffect(() => {
    fetchCustomerAppointments();
    const interval = setInterval(() => {
      fetchCustomerAppointments();
    }, 10000); // Poll every 10 seconds

    return () => clearInterval(interval);
  }, [fetchCustomerAppointments]);

  const handleAddAppointment = async (e) => {
    e.preventDefault();
    try {
      console.log('Adding new appointment:', newAppointment);
      const response = await axios.post('http://localhost:5000/api/customerappointments', newAppointment);
      console.log('Add appointment response:', response.data);
      setNewAppointment({ name: '', dayTime: '', car: null, comments: '' });
      setShowAddModal(false);
      setShowCarSelectModal(false);
      fetchCustomerAppointments();
    } catch (err) {
      console.error('Error adding customer appointment:', err);
      alert('Failed to add customer appointment: ' + err.message);
    }
  };

  const startEditing = (appointmentId, field, carItemId, value) => {
    setEditingField({ appointmentId, field, carItemId });
    setEditAppointmentId(appointmentId);
    setEditCarItemId(carItemId);
    setEditValue(value || '');
    if (field === 'car') {
      setShowCarSelectModal(true);
    }
  };

  const handleEditChange = (e) => {
    setEditValue(e.target.value);
  };

  const saveEdit = async () => {
    if (!editingField || !editAppointmentId) return;
    try {
      const updatedAppointment = customerAppointments.find(appointment => appointment._id === editAppointmentId);
      let updateData = {};

      if (editingField.field === 'name') {
        updateData.name = editValue;
        updateData.dayTime = updatedAppointment.dayTime;
        updateData.car = updatedAppointment.car ? updatedAppointment.car._id : null;
        updateData.comments = updatedAppointment.comments;
      } else if (editingField.field === 'dayTime') {
        updateData.dayTime = editValue;
        updateData.name = updatedAppointment.name;
        updateData.car = updatedAppointment.car ? updatedAppointment.car._id : null;
        updateData.comments = updatedAppointment.comments;
      } else if (editingField.field === 'comments') {
        updateData.comments = editValue;
        updateData.name = updatedAppointment.name;
        updateData.dayTime = updatedAppointment.dayTime;
        updateData.car = updatedAppointment.car ? updatedAppointment.car._id : null;
      }

      const response = await axios.put(`http://localhost:5000/api/customerappointments/${editAppointmentId}`, updateData);
      console.log('Update appointment response:', response.data);
      setEditingField(null);
      setEditAppointmentId(null);
      setEditCarItemId(null);
      setEditValue('');
      setShowCarSelectModal(false);
      fetchCustomerAppointments();
    } catch (err) {
      console.error('Error updating customer appointment:', err);
      alert('Failed to update customer appointment: ' + err.message);
    }
  };

  const cancelEdit = () => {
    setEditingField(null);
    setEditAppointmentId(null);
    setEditCarItemId(null);
    setEditValue('');
    setShowCarSelectModal(false);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this customer appointment?')) {
      try {
        console.log('Deleting appointment:', id);
        const response = await axios.delete(`http://localhost:5000/api/customerappointments/${id}`);
        console.log('Delete appointment response:', response.data);
        fetchCustomerAppointments();
      } catch (err) {
        console.error('Error deleting customer appointment:', err);
        alert('Failed to delete customer appointment: ' + err.message);
      }
    }
  };

  const handleSelectCar = async (carId) => {
    console.log('Selected car ID:', carId);
    if (editingField && editingField.field === 'car') {
      try {
        const updatedAppointment = customerAppointments.find(appointment => appointment._id === editAppointmentId);
        const updateData = {
          name: updatedAppointment.name,
          dayTime: updatedAppointment.dayTime,
          car: carId,
          comments: updatedAppointment.comments
        };

        const response = await axios.put(`http://localhost:5000/api/customerappointments/${editAppointmentId}`, updateData);
        console.log('Update appointment with new car response:', response.data);

        await fetchCustomerAppointments();

        setEditingField(null);
        setEditAppointmentId(null);
        setEditCarItemId(null);
        setShowCarSelectModal(false);
      } catch (err) {
        console.error('Error updating appointment with new car:', err);
        alert('Failed to update appointment with new car: ' + err.message);
      }
    } else {
      // When adding a new appointment
      setNewAppointment({ ...newAppointment, car: carId });
      setShowCarSelectModal(false);
    }
  };

  const handleSourceFilter = (source) => {
    setSourceFilter(source);
  };

  const getAppointmentRowColor = (dayTime, source) => {
    if (!dayTime) return source === 'whatsapp' ? '#e6f0fa' : 'transparent';

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

    return source === 'whatsapp' ? '#e6f0fa' : 'transparent';
  };

  const getOrdinalSuffix = (day) => {
    if (day % 10 === 1 && day !== 11) return 'st';
    if (day % 10 === 2 && day !== 12) return 'nd';
    if (day % 10 === 3 && day !== 13) return 'rd';
    return 'th';
  };

  const getStatusTextColor = (status) => {
    if (!status) return '#495057';
    const statusLower = status.toLowerCase();
    if (statusLower === 'ready') {
      return '#28a745';
    }
    return '#dc3545';
  };

  const filteredAppointments = customerAppointments.filter(appointment => {
    if (sourceFilter === 'all') return true;
    return appointment.source === sourceFilter;
  });

  if (loading) return <div style={{ textAlign: 'center', padding: '20px' }}>Loading...</div>;
  if (error) return <div style={{ textAlign: 'center', padding: '20px', color: '#dc3545' }}>{error}</div>;

  return (
    <DndProvider backend={HTML5Backend}>
      <div style={{ padding: '20px', fontFamily: "'Roboto', sans-serif", backgroundColor: '#fff', minHeight: '100vh' }}>
        <HamburgerMenu />
        <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#343a40', textAlign: 'center', marginBottom: '20px' }}>
          Customer Appointments
        </h1>

        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
          <button
            onClick={() => setShowAddModal(true)}
            style={{
              padding: '8px 16px',
              backgroundColor: '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            Add Customer Appointment
          </button>
          <div style={{ display: 'flex', gap: '8px' }}>
            {['all', 'manual', 'whatsapp'].map(source => (
              <button
                key={source}
                onClick={() => handleSourceFilter(source)}
                style={{
                  padding: '6px 12px',
                  backgroundColor: sourceFilter === source ? '#007bff' : '#e9ecef',
                  color: sourceFilter === source ? 'white' : '#495057',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '14px',
                }}
              >
                {source === 'all' ? 'All' : source === 'manual' ? 'Manual' : 'WhatsApp'}
              </button>
            ))}
          </div>
        </div>

        {showAddModal && (
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              backgroundColor: 'rgba(0, 0, 0, 0.6)',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              zIndex: 1000,
            }}
            onClick={() => setShowAddModal(false)}
          >
            <div
              style={{
                backgroundColor: '#fff',
                padding: '20px',
                borderRadius: '8px',
                width: '400px',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <h2 style={{ fontSize: '18px', marginBottom: '15px' }}>Add New Customer Appointment</h2>
              <form onSubmit={handleAddAppointment}>
                <div style={{ marginBottom: '10px' }}>
                  <label style={{ display: 'block', marginBottom: '5px' }}>Name</label>
                  <input
                    type="text"
                    value={newAppointment.name}
                    onChange={(e) => setNewAppointment({ ...newAppointment, name: e.target.value })}
                    required
                    style={{ width: '100%', padding: '8px', border: '1px solid #ced4da', borderRadius: '4px' }}
                  />
                </div>
                <div style={{ marginBottom: '10px' }}>
                  <label style={{ display: 'block', marginBottom: '5px' }}>Day/Time</label>
                  <input
                    type="text"
                    value={newAppointment.dayTime}
                    onChange={(e) => setNewAppointment({ ...newAppointment, dayTime: e.target.value })}
                    required
                    style={{ width: '100%', padding: '8px', border: '1px solid #ced4da', borderRadius: '4px' }}
                  />
                </div>
                <div style={{ marginBottom: '10px' }}>
                  <label style={{ display: 'block', marginBottom: '5px' }}>Car</label>
                  <button
                    type="button"
                    onClick={() => setShowCarSelectModal(true)}
                    style={{
                      padding: '8px 12px',
                      backgroundColor: '#007bff',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      width: '100%',
                      textAlign: 'left',
                    }}
                  >
                    {newAppointment.car ? 'Selected Car' : 'Select Car'}
                  </button>
                </div>
                <div style={{ marginBottom: '10px' }}>
                  <label style={{ display: 'block', marginBottom: '5px' }}>Comments</label>
                  <textarea
                    value={newAppointment.comments}
                    onChange={(e) => setNewAppointment({ ...newAppointment, comments: e.target.value })}
                    style={{ width: '100%', padding: '8px', border: '1px solid #ced4da', borderRadius: '4px', minHeight: '80px' }}
                  />
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
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              backgroundColor: 'rgba(0, 0, 0, 0.6)',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              zIndex: 1000,
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
              <h2 style={{ fontSize: '18px', marginBottom: '15px' }}>Select a Car</h2>
              <CarSelectTable
                onSelectCar={handleSelectCar}
                onClose={() => setShowCarSelectModal(false)}
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

        <table style={{ width: '100%', borderCollapse: 'collapse', backgroundColor: '#fff', borderRadius: '8px', overflow: 'hidden' }}>
          <thead>
            <tr style={{ backgroundColor: '#e8ecef', height: '30px' }}>
              <th style={{ padding: '6px', border: '1px solid #dee2e6', textAlign: 'left' }}>Name</th>
              <th style={{ padding: '6px', border: '1px solid #dee2e6', textAlign: 'left' }}>Day/Time</th>
              <th style={{ padding: '6px', border: '1px solid #dee2e6', textAlign: 'left' }}>Car</th>
              <th style={{ padding: '6px', border: '1px solid #dee2e6', textAlign: 'left' }}>Comments</th>
              <th style={{ padding: '6px', border: '1px solid #dee2e6', textAlign: 'left' }}>Date Created</th>
              <th style={{ padding: '6px', border: '1px solid #dee2e6', textAlign: 'left' }}>Source</th>
              <th style={{ padding: '6px', border: '1px solid #dee2e6', textAlign: 'left' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredAppointments.map((appointment) => (
              <tr
                key={appointment._id}
                style={{
                  backgroundColor: getAppointmentRowColor(appointment.dayTime, appointment.source),
                  transition: 'background-color 0.2s',
                  height: '50px',
                }}
              >
                <td
                  style={{ padding: '6px', border: '1px solid #dee2e6', verticalAlign: 'middle' }}
                  onDoubleClick={() => startEditing(appointment._id, 'name', null, appointment.name)}
                >
                  {editingField && editingField.appointmentId === appointment._id && editingField.field === 'name' ? (
                    <input
                      type="text"
                      value={editValue}
                      onChange={handleEditChange}
                      onBlur={saveEdit}
                      onKeyPress={(e) => e.key === 'Enter' && saveEdit()}
                      onKeyDown={(e) => e.key === 'Escape' && cancelEdit()}
                      autoFocus
                      style={{ width: '100%', padding: '4px', border: '1px solid #ced4da', borderRadius: '4px' }}
                    />
                  ) : (
                    appointment.name || '-'
                  )}
                </td>
                <td
                  style={{ padding: '6px', border: '1px solid #dee2e6', verticalAlign: 'middle' }}
                  onDoubleClick={() => startEditing(appointment._id, 'dayTime', null, appointment.dayTime)}
                >
                  {editingField && editingField.appointmentId === appointment._id && editingField.field === 'dayTime' ? (
                    <input
                      type="text"
                      value={editValue}
                      onChange={handleEditChange}
                      onBlur={saveEdit}
                      onKeyPress={(e) => e.key === 'Enter' && saveEdit()}
                      onKeyDown={(e) => e.key === 'Escape' && cancelEdit()}
                      autoFocus
                      style={{ width: '100%', padding: '4px', border: '1px solid #ced4da', borderRadius: '4px' }}
                    />
                  ) : (
                    appointment.dayTime || '-'
                  )}
                </td>
                <td
                  style={{ padding: '6px', border: '1px solid #dee2e6', minWidth: '300px', verticalAlign: 'middle' }}
                  onDoubleClick={() => startEditing(appointment._id, 'car', appointment._id, appointment.car ? appointment.car._id : null)}
                >
                  {appointment.car ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{ flexShrink: 0 }}>
                        {appointment.car.photos && appointment.car.photos.length > 0 ? (
                          <img
                            src={`http://localhost:5000/${appointment.car.photos[0]}`}
                            alt={`Car ${appointment.car.rego}`}
                            style={{ width: '60px', height: '40px', objectFit: 'cover', borderRadius: '4px' }}
                          />
                        ) : (
                          <span style={{ display: 'inline-block', width: '60px', height: '40px' }}></span>
                        )}
                      </div>
                      <div style={{ flexGrow: 1, marginLeft: '0px' }}>
                        <div style={{ fontSize: '14px', fontWeight: '500', lineHeight: '1.2' }}>
                          {`${appointment.car.make || '-'} ${appointment.car.model || ''}${appointment.car.badge ? ` ${appointment.car.badge}` : ''}`.trim()}
                        </div>
                        <div style={{ fontSize: '12px', color: '#495057', lineHeight: '1.2' }}>
                          <span>Rego: {appointment.car.rego || '-'}</span>
                          <span style={{ marginLeft: '10px' }}>
                            Location: <span style={{ color: appointment.car.location && appointment.car.location.toLowerCase() !== 'northpoint' ? 'red' : '#495057' }}>{appointment.car.location || '-'}</span>
                          </span>
                          <span style={{ marginLeft: '10px' }}>
                            Status: {appointment.car.status || '-'}
                          </span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div>
                      {appointment.carDetails && (appointment.carDetails.make || appointment.carDetails.model) ? (
                        <div style={{ fontSize: '14px', fontWeight: '500' }}>
                          {`${appointment.carDetails.make || '-'} ${appointment.carDetails.model || ''}`.trim()}
                          {appointment.carDetails.badge && `, ${appointment.carDetails.badge}`}
                          {appointment.carDetails.rego && `, ${appointment.carDetails.rego}`}
                        </div>
                      ) : (
                        '-'
                      )}
                    </div>
                  )}
                </td>
                <td
                  style={{ padding: '6px', border: '1px solid #dee2e6', verticalAlign: 'middle' }}
                  onDoubleClick={() => startEditing(appointment._id, 'comments', null, appointment.comments)}
                >
                  {editingField && editingField.appointmentId === appointment._id && editingField.field === 'comments' ? (
                    <textarea
                      value={editValue}
                      onChange={handleEditChange}
                      onBlur={saveEdit}
                      onKeyPress={(e) => e.key === 'Enter' && saveEdit()}
                      onKeyDown={(e) => e.key === 'Escape' && cancelEdit()}
                      autoFocus
                      style={{ width: '100%', padding: '4px', border: '1px solid #ced4da', borderRadius: '4px', minHeight: '40px' }}
                    />
                  ) : (
                    appointment.comments || '-'
                  )}
                </td>
                <td style={{ padding: '6px', border: '1px solid #dee2e6', verticalAlign: 'middle' }}>
                  {new Date(appointment.dateCreated).toLocaleDateString()}
                </td>
                <td style={{ padding: '6px', border: '1px solid #dee2e6', verticalAlign: 'middle' }}>
                  <span style={{ fontSize: '12px', color: appointment.source === 'whatsapp' ? '#007bff' : '#495057' }}>
                    {appointment.source === 'whatsapp' ? 'WhatsApp' : 'Manual'}
                  </span>
                </td>
                <td style={{ padding: '6px', border: '1px solid #dee2e6', width: '50px', textAlign: 'center', verticalAlign: 'middle' }}>
                  <button
                    onClick={() => handleDelete(appointment._id)}
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
    </DndProvider>
  );
};

export default CustomerAppointments;