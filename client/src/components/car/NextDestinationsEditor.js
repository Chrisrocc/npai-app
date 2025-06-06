import React, { useState, useEffect } from 'react';
import axios from '../../utils/axiosConfig';

const NextDestinationsEditor = ({ carId, nextDestinations, onSave, onCancel, fetchCars, onSetCurrentLocation }) => {
  const [localNextDestinations, setLocalNextDestinations] = useState(nextDestinations || []);
  const [newLocation, setNewLocation] = useState('');
  const [editingIndex, setEditingIndex] = useState(null);
  const [editValue, setEditValue] = useState('');

  // Sync local state with prop changes
  useEffect(() => {
    setLocalNextDestinations(nextDestinations || []);
  }, [nextDestinations]);

  const handleAddLocation = async () => {
    if (!newLocation.trim()) return;

    try {
      const response = await axios.post(`/api/cars/${carId}/next`, { location: newLocation });
      setNewLocation('');
      setLocalNextDestinations(response.data.next); // Update local state
      if (fetchCars) fetchCars(); // Update parent state without closing the form
      // Do NOT call onSave, so the form stays open
    } catch (err) {
      console.error('Error adding next location:', err);
      alert('Failed to add next location');
    }
  };

  const handleDeleteLocation = async (index) => {
    try {
      const response = await axios.delete(`/api/cars/${carId}/next/${index}`);
      setLocalNextDestinations(response.data.next);
      if (fetchCars) fetchCars();
    } catch (err) {
      console.error('Error deleting next location:', err);
      alert('Failed to delete next location');
    }
  };

  const handleSetAsCurrentLocation = async (index) => {
    const destination = localNextDestinations[index];
    if (!destination || !destination.location) return;

    try {
      if (onSetCurrentLocation) {
        await onSetCurrentLocation(destination.location, index);
      }
      const updatedCar = await axios.get(`/api/cars/${carId}`);
      setLocalNextDestinations(updatedCar.data.next);
    } catch (err) {
      console.error('Error setting current location:', err);
      alert('Failed to set current location');
    }
  };

  const startEditing = (index, value) => {
    setEditingIndex(index);
    setEditValue(value);
  };

  const handleEditChange = (e) => {
    setEditValue(e.target.value);
  };

  const saveEdit = async () => {
    if (editingIndex === null) return;

    const updatedDestinations = [...localNextDestinations];
    updatedDestinations[editingIndex] = {
      ...updatedDestinations[editingIndex],
      location: editValue,
    };

    try {
      const response = await axios.put(`/api/cars/${carId}`, { next: updatedDestinations });
      setLocalNextDestinations(response.data.next);
      setEditingIndex(null);
      setEditValue('');
      if (fetchCars) fetchCars();
    } catch (err) {
      console.error('Error updating next destination:', err);
      alert('Failed to update next destination');
    }
  };

  const cancelEdit = () => {
    setEditingIndex(null);
    setEditValue('');
  };

  const handleSave = () => {
    onSave(); // Explicitly close the form when the user clicks "Save"
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ width: '500px', maxHeight: '80vh', overflowY: 'auto' }}>
        <h3>Edit Next Destinations</h3>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
          <thead>
            <tr style={{ backgroundColor: '#e8ecef' }}>
              <th style={{ border: '1px solid #dee2e6', padding: '8px', textAlign: 'left' }}>Location</th>
              <th style={{ border: '1px solid #dee2e6', padding: '8px', textAlign: 'left' }}>Created</th>
              <th style={{ border: '1px solid #dee2e6', padding: '8px', textAlign: 'left' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {localNextDestinations.length > 0 ? (
              localNextDestinations.map((entry, index) => (
                <tr key={index}>
                  <td style={{ border: '1px solid #dee2e6', padding: '8px' }}>
                    {editingIndex === index ? (
                      <input
                        type="text"
                        value={editValue}
                        onChange={handleEditChange}
                        onBlur={saveEdit}
                        onKeyPress={(e) => e.key === 'Enter' && saveEdit()}
                        onKeyDown={(e) => e.key === 'Escape' && cancelEdit()}
                        autoFocus
                        style={{ padding: '5px', width: '100%', border: '1px solid #ced4da', borderRadius: '4px' }}
                      />
                    ) : (
                      <span onDoubleClick={() => startEditing(index, entry.location)} style={{ fontSize: '14px', color: '#495057' }}>
                        {entry.location || 'N/A'}
                      </span>
                    )}
                  </td>
                  <td style={{ border: '1px solid #dee2e6', padding: '8px' }}>
                    <span style={{ fontSize: '14px', color: '#495057' }}>
                      {new Date(entry.created).toLocaleDateString()}
                    </span>
                  </td>
                  <td style={{ border: '1px solid #dee2e6', padding: '8px' }}>
                    <button
                      onClick={() => handleSetAsCurrentLocation(index)}
                      style={{
                        padding: '5px 10px',
                        backgroundColor: '#28a745',
                        color: 'white',
                        border: 'none',
                        cursor: 'pointer',
                        borderRadius: '4px',
                        fontSize: '12px',
                        marginRight: '5px',
                      }}
                    >
                      Set Current Location
                    </button>
                    <button
                      onClick={() => handleDeleteLocation(index)}
                      style={{
                        padding: '5px 10px',
                        backgroundColor: '#dc3545',
                        color: 'white',
                        border: 'none',
                        cursor: 'pointer',
                        borderRadius: '4px',
                        fontSize: '12px',
                      }}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="3" style={{ textAlign: 'center', padding: '8px', color: '#6c757d' }}>
                  No Next Destinations
                </td>
              </tr>
            )}
          </tbody>
        </table>
        <div style={{ marginTop: '10px', display: 'flex', gap: '10px' }}>
          <input
            type="text"
            value={newLocation}
            onChange={(e) => setNewLocation(e.target.value)}
            placeholder="Add new destination"
            style={{ padding: '5px', flex: 1, border: '1px solid #ced4da', borderRadius: '4px' }}
          />
          <button
            onClick={handleAddLocation}
            style={{
              padding: '5px 10px',
              backgroundColor: '#007bff',
              color: 'white',
              border: 'none',
              cursor: 'pointer',
              borderRadius: '4px',
              fontSize: '12px',
            }}
          >
            +
          </button>
        </div>
        <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
          <button
            onClick={onCancel}
            style={{
              padding: '8px 16px',
              backgroundColor: '#6c757d',
              color: 'white',
              border: 'none',
              cursor: 'pointer',
              borderRadius: '4px',
              fontSize: '14px',
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            style={{
              padding: '8px 16px',
              backgroundColor: '#28a745',
              color: 'white',
              border: 'none',
              cursor: 'pointer',
              borderRadius: '4px',
              fontSize: '14px',
            }}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
};

export default NextDestinationsEditor;