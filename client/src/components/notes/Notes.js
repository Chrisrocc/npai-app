import React, { useState, useEffect, useCallback } from 'react';
import axios from '../../utils/axiosConfig';
import HamburgerMenu from '../shared/HamburgerMenu';
import { useNavigate } from 'react-router-dom';
import CarSelectTable from '../shared/CarSelectTable';

const Notes = () => {
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editingField, setEditingField] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [editNoteId, setEditNoteId] = useState(null);
  const [editCarItemId, setEditCarItemId] = useState(null);
  const [showCarSelectModal, setShowCarSelectModal] = useState(false);
  const navigate = useNavigate();

  const fetchNotes = useCallback(async () => {
    try {
      console.log('Fetching notes...');
      const response = await axios.get('/api/notes');
      console.log('Notes response:', response.data);
      if (!Array.isArray(response.data)) {
        throw new Error('Expected an array of notes, but received: ' + JSON.stringify(response.data));
      }
      setNotes(response.data);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching notes:', err);
      if (err.response?.status === 401 || err.response?.status === 403) {
        navigate('/login');
      } else {
        setError('Failed to fetch notes: ' + err.message);
        setLoading(false);
      }
    }
  }, [navigate]);

  useEffect(() => {
    fetchNotes();
    const interval = setInterval(() => {
      fetchNotes();
    }, 10000); // Poll every 10 seconds

    return () => clearInterval(interval);
  }, [fetchNotes]);

  const startEditing = (noteId, field, carItemId) => {
    console.log('startEditing called with:', { noteId, field, carItemId });
    setEditingField({ noteId, field, carItemId });
    setEditNoteId(noteId);
    setEditCarItemId(carItemId);
    if (field === 'car') {
      console.log('Setting showCarSelectModal to true');
      setShowCarSelectModal(true);
    }
  };

  const handleEditChange = (e) => {
    setEditValue(e.target.value);
  };

  const saveEdit = async () => {
    if (!editingField || !editNoteId) return;
    console.log('saveEdit called with:', { editingField, editNoteId, editValue });
    try {
      const updatedNote = notes.find(note => note._id === editNoteId);
      let updateData = {};

      if (editingField.field === 'message') {
        updateData.message = editValue;
        updateData.carItems = updatedNote.carItems.map(item => ({
          car: item.car ? item.car._id : null,
          carDetails: item.carDetails
        }));
      }

      const response = await axios.put(`/api/notes/${editNoteId}`, updateData);
      console.log('Update note response:', response.data);
      setNotes(prevNotes =>
        prevNotes.map(note =>
          note._id === editNoteId ? { ...note, ...response.data } : note
        )
      );
      setEditingField(null);
      setEditNoteId(null);
      setEditCarItemId(null);
      setEditValue('');
    } catch (err) {
      console.error('Error updating note:', err);
      alert('Failed to update note: ' + err.message);
    }
  };

  const cancelEdit = () => {
    console.log('Cancelling edit');
    setEditingField(null);
    setEditNoteId(null);
    setEditCarItemId(null);
    setEditValue('');
    setShowCarSelectModal(false);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this note?')) {
      try {
        console.log('Deleting note:', id);
        const response = await axios.delete(`/api/notes/${id}`);
        console.log('Delete note response:', response.data);
        fetchNotes();
      } catch (err) {
        console.error('Error deleting note:', err);
        alert('Failed to delete note: ' + err.message);
      }
    }
  };

  const handleSelectCar = async (carId) => {
    console.log('handleSelectCar called with carId:', carId);
    if (editingField && editingField.field === 'car') {
      try {
        const updatedNote = notes.find(note => note._id === editNoteId);
        const updateData = {
          message: updatedNote.message,
          carItems: updatedNote.carItems.map(item => {
            if (item._id === editCarItemId) {
              return {
                ...item,
                car: carId,
                carDetails: null // Let the backend populate carDetails
              };
            }
            return {
              car: item.car ? item.car._id : null,
              carDetails: item.carDetails
            };
          })
        };

        const response = await axios.put(`/api/notes/${editNoteId}`, updateData);
        console.log('Update note with new car response:', response.data);

        await fetchNotes();

        setEditingField(null);
        setEditNoteId(null);
        setEditCarItemId(null);
        setShowCarSelectModal(false);
      } catch (err) {
        console.error('Error updating note with new car:', err);
        alert('Failed to update note with new car: ' + err.message);
      }
    }
  };

  const formatDateTime = (date) => {
    const d = new Date(date);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = String(d.getFullYear()).slice(-2);
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${day}/${month}/${year} ${hours}:${minutes}`;
  };

  const renderNoteTable = () => {
    const rows = notes.map(note => {
      const carItem = note.carItems && note.carItems.length > 0 ? note.carItems[0] : { car: null, carDetails: {} };
      return {
        ...note,
        car: carItem.car,
        carDetails: carItem.carDetails,
        carItemId: carItem._id,
        rowKey: note._id
      };
    });

    return (
      <div style={{ padding: '10px' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', backgroundColor: '#fff', borderRadius: '8px', overflow: 'hidden' }}>
          <thead>
            <tr style={{ backgroundColor: '#e8ecef', height: '30px' }}>
              <th style={{ padding: '6px', border: '1px solid #dee2e6', textAlign: 'left' }}>Notes</th>
              <th style={{ padding: '6px', border: '1px solid #dee2e6', textAlign: 'left' }}>Car</th>
              <th style={{ padding: '6px', border: '1px solid #dee2e6', textAlign: 'left' }}>Created</th>
              <th style={{ padding: '6px', border: '1px solid #dee2e6', textAlign: 'left' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(row => (
              <tr key={row.rowKey} style={{ height: '50px' }}>
                <td
                  style={{ padding: '6px', border: '1px solid #dee2e6', verticalAlign: 'middle' }}
                  onDoubleClick={() => {
                    console.log('Double-clicked Notes column for note:', row._id);
                    startEditing(row._id, 'message', row.carItemId);
                  }}
                >
                  {editingField && editingField.noteId === row._id && editingField.field === 'message' ? (
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
                    row.message || '-'
                  )}
                </td>
                <td
                  style={{ padding: '6px', border: '1px solid #dee2e6', minWidth: '300px', verticalAlign: 'middle' }}
                >
                  <div
                    style={{ display: 'flex', alignItems: 'center', gap: '10px' }}
                    onDoubleClick={(e) => {
                      console.log('Double-clicked Car column div for note:', row._id);
                      console.log('Row data:', row);
                      e.stopPropagation();
                      startEditing(row._id, 'car', row.carItemId);
                    }}
                  >
                    {row.car ? (
                      <>
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
                      </>
                    ) : (
                      <div>
                        {row.carDetails && (row.carDetails.make || row.carDetails.model) ? (
                          <div style={{ fontSize: '14px', fontWeight: '500' }}>
                            {`${row.carDetails.make || '-'} ${row.carDetails.model || ''}${row.carDetails.badge ? ` ${row.carDetails.badge}` : ''}`.trim()}
                          </div>
                        ) : (
                          '-'
                        )}
                      </div>
                    )}
                  </div>
                </td>
                <td style={{ padding: '6px', border: '1px solid #dee2e6', verticalAlign: 'middle' }}>
                  {formatDateTime(row.dateCreated)}
                </td>
                <td style={{ padding: '6px', border: '1px solid #dee2e6', width: '50px', textAlign: 'center', verticalAlign: 'middle' }}>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(row._id);
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
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  console.log('Rendering Notes component, showCarSelectModal:', showCarSelectModal);

  if (loading) return <div style={{ textAlign: 'center', padding: '20px' }}>Loading...</div>;
  if (error) return <div style={{ textAlign: 'center', padding: '20px', color: '#dc3545' }}>{error}</div>;

  return (
    <div style={{ padding: '20px', fontFamily: "'Roboto', sans-serif", backgroundColor: '#fff', minHeight: '100vh' }}>
      <HamburgerMenu />
      <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#343a40', textAlign: 'center', marginBottom: '20px' }}>
        Notes
      </h1>
      {renderNoteTable()}
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
          onClick={() => {
            console.log('Closing car selection modal via background click');
            setShowCarSelectModal(false);
          }}
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
              onClose={() => {
                console.log('CarSelectTable onClose triggered');
                setShowCarSelectModal(false);
              }}
            />
            <button
              onClick={() => {
                console.log('Close button clicked');
                setShowCarSelectModal(false);
              }}
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
    </div>
  );
};

export default Notes;