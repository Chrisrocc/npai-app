import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from '../../utils/axiosConfig';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import NextDestinationsEditor from './NextDestinationsEditor';

const ItemTypes = {
  PHOTO: 'photo',
};

const Photo = ({ photo, index, movePhoto, deletePhoto, rego }) => {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: ItemTypes.PHOTO,
    item: { index },
    collect: (monitor) => ({
      isDragging: !!monitor.isDragging(),
    }),
  }));

  const [, drop] = useDrop(() => ({
    accept: ItemTypes.PHOTO,
    hover: (item) => {
      if (item.index !== index) {
        movePhoto(item.index, index);
        item.index = index;
      }
    },
  }));

  return (
    <div
      ref={(node) => drag(drop(node))}
      style={{
        position: 'relative',
        opacity: isDragging ? 0.5 : 1,
      }}
    >
      <img
        src={`${process.env.REACT_APP_API_URL}/uploads/${photo}`}
        alt={`Car ${rego} - Photo ${index + 1}`}
        style={{ width: '100px', height: '100px', objectFit: 'cover', borderRadius: '4px' }}
        onError={(e) => console.error(`Failed to load image: ${photo}`, e)}
      />
      <button
        onClick={() => deletePhoto(index)}
        style={{
          position: 'absolute',
          top: '5px',
          right: '5px',
          backgroundColor: '#dc3545',
          color: 'white',
          border: 'none',
          cursor: 'pointer',
          borderRadius: '50%',
          width: '20px',
          height: '20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '12px',
        }}
      >
        X
      </button>
    </div>
  );
};

const CarProfileModal = ({ carId: propCarId, onClose, fetchCars, isModal = true }) => {
  const { id: routeCarId } = useParams();
  const navigate = useNavigate();
  const carId = propCarId || routeCarId;

  const [car, setCar] = useState(null);
  const [modalLoading, setModalLoading] = useState(true);
  const [modalError, setModalError] = useState(null);
  const [editingField, setEditingField] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [newChecklistItem, setNewChecklistItem] = useState('');
  const [newPhotos, setNewPhotos] = useState([]);
  const [existingPhotos, setExistingPhotos] = useState([]);
  const [editingHistory, setEditingHistory] = useState(null);
  const [showNextEditor, setShowNextEditor] = useState(false);

  useEffect(() => {
    const fetchCar = async () => {
      try {
        const response = await axios.get(`/api/cars/${carId}`);
        setCar(response.data);
        setExistingPhotos(response.data.photos || []); // Initialize existing photos
        setModalLoading(false);
      } catch (err) {
        setModalError('Failed to fetch car details');
        setModalLoading(false);
      }
    };
    fetchCar();
  }, [carId]);

  // Reduce polling frequency to avoid overload
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const response = await axios.get(`/api/cars/${carId}`);
        setCar(response.data);
        setExistingPhotos(response.data.photos || []);
      } catch (err) {
        console.error('Error polling car data:', err);
      }
    }, 30000); // Poll every 30 seconds instead of 5

    return () => clearInterval(interval);
  }, [carId]);

  const fetchCarWithoutRefresh = async () => {
    try {
      const response = await axios.get(`/api/cars/${carId}`);
      setCar(response.data);
      setExistingPhotos(response.data.photos || []);
      if (fetchCars) fetchCars(); // Call parent fetchCars to update the table
    } catch (err) {
      console.error('Error fetching car:', err);
    }
  };

  const startEditingModal = (field, value) => {
    setEditingField(field);
    setEditValue(value || '');
  };

  const handleEditChangeModal = (e) => {
    setEditValue(e.target.value);
  };

  const saveEditModal = async () => {
    if (!editingField) return;
    try {
      const updatedCar = { [editingField]: editValue };
      await axios.put(`/api/cars/${carId}`, updatedCar);
      await fetchCarWithoutRefresh();
      setEditingField(null);
      setEditValue('');
    } catch (err) {
      console.error('Error updating car:', err);
      alert('Failed to update car');
    }
  };

  const cancelEditModal = () => {
    setEditingField(null);
    setEditValue('');
  };

  const startEditingHistory = (index, field, value) => {
    setEditingHistory({ index, field });
    setEditValue(value ? new Date(value).toISOString().split('T')[0] : '');
  };

  const handleHistoryEditChange = (e) => {
    setEditValue(e.target.value);
  };

  const saveHistoryEdit = async () => {
    if (!editingHistory) return;
    try {
      const updatedHistory = [...car.history];
      const entry = updatedHistory[editingHistory.index];
      if (editingHistory.field === 'dateAdded' || editingHistory.field === 'dateLeft') {
        entry[editingHistory.field] = editValue ? new Date(editValue) : null;
      } else {
        entry[editingHistory.field] = editValue;
      }
      await axios.put(`/api/cars/${carId}`, { history: updatedHistory });
      await fetchCarWithoutRefresh();
      setEditingHistory(null);
      setEditValue('');
    } catch (err) {
      console.error('Error updating history:', err);
      alert('Failed to update history');
    }
  };

  const cancelHistoryEdit = () => {
    setEditingHistory(null);
    setEditValue('');
  };

  const handleDeleteHistoryEntry = async (index) => {
    try {
      const updatedHistory = car.history.filter((_, i) => i !== index);
      await axios.put(`/api/cars/${carId}`, { history: updatedHistory });
      await fetchCarWithoutRefresh();
    } catch (err) {
      console.error('Error deleting history entry:', err);
      alert('Failed to delete history entry');
    }
  };

  const handleChecklistEdit = async (index, newValue) => {
    const updatedChecklist = [...car.checklist];
    updatedChecklist[index] = newValue;
    try {
      await axios.put(`/api/cars/${carId}`, { checklist: updatedChecklist });
      await fetchCarWithoutRefresh();
    } catch (err) {
      console.error('Error updating checklist:', err);
      alert('Failed to update checklist');
    }
  };

  const handleAddChecklistItem = async () => {
    if (newChecklistItem && !car.checklist.includes(newChecklistItem)) {
      const updatedChecklist = [...car.checklist, newChecklistItem];
      try {
        await axios.put(`/api/cars/${carId}`, { checklist: updatedChecklist });
        await fetchCarWithoutRefresh();
        setNewChecklistItem('');
      } catch (err) {
        console.error('Error adding checklist item:', err);
        alert('Failed to add checklist item');
      }
    }
  };

  const handleRemoveChecklistItem = async (index) => {
    const updatedChecklist = car.checklist.filter((_, i) => i !== index);
    try {
      await axios.put(`/api/cars/${carId}`, { checklist: updatedChecklist });
      await fetchCarWithoutRefresh();
    } catch (err) {
      console.error('Error removing checklist item:', err);
      alert('Failed to remove checklist item');
    }
  };

  const handleStageChange = async (newStage) => {
    try {
      await axios.put(`/api/cars/${carId}`, { stage: newStage });
      await fetchCarWithoutRefresh();
    } catch (err) {
      console.error('Error updating stage:', err);
      alert('Failed to update stage');
    }
  };

  const handleFileChange = (e) => {
    const selectedFiles = Array.from(e.target.files);
    setNewPhotos((prevPhotos) => [...prevPhotos, ...selectedFiles]);
  };

  const handleAddPhotos = async () => {
    if (newPhotos.length === 0) return;
    try {
      const formData = new FormData();
      formData.append('existingPhotos', JSON.stringify(existingPhotos)); // Send as JSON string
      newPhotos.forEach((photo) => formData.append('photos', photo)); // Send new photos as files
      await axios.put(`/api/cars/${carId}`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      await fetchCarWithoutRefresh();
      setNewPhotos([]);
    } catch (err) {
      console.error('Error adding photos:', err);
      alert('Failed to add photos: ' + (err.response?.data?.message || err.message));
    }
  };

  const handleDeletePhoto = async (index) => {
    const updatedPhotos = existingPhotos.filter((_, i) => i !== index);
    setExistingPhotos(updatedPhotos);
    try {
      await axios.put(`/api/cars/${carId}`, { photos: updatedPhotos });
      await fetchCarWithoutRefresh();
    } catch (err) {
      console.error('Error deleting photo:', err);
      alert('Failed to delete photo');
    }
  };

  const movePhoto = async (fromIndex, toIndex) => {
    const updatedPhotos = [...existingPhotos];
    const [movedPhoto] = updatedPhotos.splice(fromIndex, 1);
    updatedPhotos.splice(toIndex, 0, movedPhoto);
    setExistingPhotos(updatedPhotos);
    try {
      await axios.put(`/api/cars/${carId}`, { photos: updatedPhotos });
      await fetchCarWithoutRefresh();
    } catch (err) {
      console.error('Error rearranging photos:', err);
      alert('Failed to rearrange photos');
    }
  };

  const handleCloseNextEditor = () => {
    setShowNextEditor(false);
  };

  const handleSetCurrentLocation = async (newLocation, indexToRemove) => {
    try {
      const updatedNext = [...(car.next || [])];
      updatedNext.splice(indexToRemove, 1);

      await axios.post(`/api/cars/${carId}/set-location`, {
        location: newLocation,
        message: `Set as current location from next list`,
        next: updatedNext,
      });

      await fetchCarWithoutRefresh();
    } catch (err) {
      console.error('Error setting current location:', err);
      alert('Failed to set current location');
    }
  };

  if (modalLoading) return <div style={{ padding: '20px', textAlign: 'center' }}>Loading...</div>;
  if (modalError) return <div style={{ padding: '20px', textAlign: 'center', color: '#dc3545' }}>{modalError}</div>;
  if (!car) return <div style={{ padding: '20px', textAlign: 'center' }}>Car not found</div>;

  const stageOptions = ['In Works', 'In Works/Online', 'Online', 'Sold'];

  return (
    <DndProvider backend={HTML5Backend}>
      <div
        style={{
          ...(isModal
            ? {
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
              }
            : {
                maxWidth: '800px',
                margin: '0 auto',
                padding: '20px',
              }),
        }}
        onClick={isModal ? onClose : undefined}
      >
        <div
          style={{
            backgroundColor: '#fff',
            padding: '24px',
            borderRadius: '12px',
            ...(isModal
              ? { width: '600px', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)' }
              : {}),
          }}
          onClick={(e) => isModal && e.stopPropagation()}
        >
          {!isModal && (
            <button
              onClick={() => navigate('/')}
              style={{ padding: '10px 20px', backgroundColor: '#007bff', color: 'white', border: 'none', cursor: 'pointer', marginBottom: '20px' }}
            >
              Back to List
            </button>
          )}
          <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#343a40', marginBottom: '20px', textAlign: 'center' }}>
            Car Profile: {car.rego}
          </h2>

          {/* Details Section */}
          <div style={{ marginBottom: '20px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#343a40', marginBottom: '10px' }}>Details</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div>
                <strong style={{ fontSize: '14px', color: '#495057' }}>Make: </strong>
                {editingField === 'make' ? (
                  <input
                    type="text"
                    value={editValue}
                    onChange={handleEditChangeModal}
                    onBlur={saveEditModal}
                    onKeyPress={(e) => e.key === 'Enter' && saveEditModal()}
                    onKeyDown={(e) => e.key === 'Escape' && cancelEditModal()}
                    autoFocus
                    style={{ padding: '5px', width: '100%', border: '1px solid #ced4da', borderRadius: '4px' }}
                  />
                ) : (
                  <span onDoubleClick={() => startEditingModal('make', car.make)} style={{ fontSize: '14px', color: '#495057' }}>
                    {car.make || 'N/A'}
                  </span>
                )}
              </div>
              <div>
                <strong style={{ fontSize: '14px', color: '#495057' }}>Model: </strong>
                {editingField === 'model' ? (
                  <input
                    type="text"
                    value={editValue}
                    onChange={handleEditChangeModal}
                    onBlur={saveEditModal}
                    onKeyPress={(e) => e.key === 'Enter' && saveEditModal()}
                    onKeyDown={(e) => e.key === 'Escape' && cancelEditModal()}
                    autoFocus
                    style={{ padding: '5px', width: '100%', border: '1px solid #ced4da', borderRadius: '4px' }}
                  />
                ) : (
                  <span onDoubleClick={() => startEditingModal('model', car.model)} style={{ fontSize: '14px', color: '#495057' }}>
                    {car.model || 'N/A'}
                  </span>
                )}
              </div>
              <div>
                <strong style={{ fontSize: '14px', color: '#495057' }}>Badge: </strong>
                {editingField === 'badge' ? (
                  <input
                    type="text"
                    value={editValue}
                    onChange={handleEditChangeModal}
                    onBlur={saveEditModal}
                    onKeyPress={(e) => e.key === 'Enter' && saveEditModal()}
                    onKeyDown={(e) => e.key === 'Escape' && cancelEditModal()}
                    autoFocus
                    style={{ padding: '5px', width: '100%', border: '1px solid #ced4da', borderRadius: '4px' }}
                  />
                ) : (
                  <span onDoubleClick={() => startEditingModal('badge', car.badge)} style={{ fontSize: '14px', color: '#495057' }}>
                    {car.badge || 'N/A'}
                  </span>
                )}
              </div>
              <div>
                <strong style={{ fontSize: '14px', color: '#495057' }}>Rego: </strong>
                {editingField === 'rego' ? (
                  <input
                    type="text"
                    value={editValue}
                    onChange={handleEditChangeModal}
                    onBlur={saveEditModal}
                    onKeyPress={(e) => e.key === 'Enter' && saveEditModal()}
                    onKeyDown={(e) => e.key === 'Escape' && cancelEditModal()}
                    autoFocus
                    style={{ padding: '5px', width: '100%', border: '1px solid #ced4da', borderRadius: '4px' }}
                  />
                ) : (
                  <span onDoubleClick={() => startEditingModal('rego', car.rego)} style={{ fontSize: '14px', color: '#495057' }}>
                    {car.rego || 'N/A'}
                  </span>
                )}
              </div>
              <div>
                <strong style={{ fontSize: '14px', color: '#495057' }}>Year: </strong>
                {editingField === 'year' ? (
                  <input
                    type="number"
                    value={editValue}
                    onChange={handleEditChangeModal}
                    onBlur={saveEditModal}
                    onKeyPress={(e) => e.key === 'Enter' && saveEditModal()}
                    onKeyDown={(e) => e.key === 'Escape' && cancelEditModal()}
                    autoFocus
                    style={{ padding: '5px', width: '100%', border: '1px solid #ced4da', borderRadius: '4px' }}
                  />
                ) : (
                  <span onDoubleClick={() => startEditingModal('year', car.year)} style={{ fontSize: '14px', color: '#495057' }}>
                    {car.year || 'N/A'}
                  </span>
                )}
              </div>
              <div>
                <strong style={{ fontSize: '14px', color: '#495057' }}>Description: </strong>
                {editingField === 'description' ? (
                  <input
                    type="text"
                    value={editValue}
                    onChange={handleEditChangeModal}
                    onBlur={saveEditModal}
                    onKeyPress={(e) => e.key === 'Enter' && saveEditModal()}
                    onKeyDown={(e) => e.key === 'Escape' && cancelEditModal()}
                    autoFocus
                    style={{ padding: '5px', width: '100%', border: '1px solid #ced4da', borderRadius: '4px' }}
                  />
                ) : (
                  <span onDoubleClick={() => startEditingModal('description', car.description)} style={{ fontSize: '14px', color: '#495057' }}>
                    {car.description || 'N/A'}
                  </span>
                )}
              </div>
              <div>
                <strong style={{ fontSize: '14px', color: '#495057' }}>Location: </strong>
                {editingField === 'location' ? (
                  <input
                    type="text"
                    value={editValue}
                    onChange={handleEditChangeModal}
                    onBlur={saveEditModal}
                    onKeyPress={(e) => e.key === 'Enter' && saveEditModal()}
                    onKeyDown={(e) => e.key === 'Escape' && cancelEditModal()}
                    autoFocus
                    style={{ padding: '5px', width: '100%', border: '1px solid #ced4da', borderRadius: '4px' }}
                  />
                ) : (
                  <span onDoubleClick={() => startEditingModal('location', car.location || 'N/A')} style={{ fontSize: '14px', color: '#495057' }}>
                    {car.location || 'N/A'}
                  </span>
                )}
              </div>
              <div>
                <strong style={{ fontSize: '14px', color: '#495057' }}>Status: </strong>
                {editingField === 'status' ? (
                  <input
                    type="text"
                    value={editValue}
                    onChange={handleEditChangeModal}
                    onBlur={saveEditModal}
                    onKeyPress={(e) => e.key === 'Enter' && saveEditModal()}
                    onKeyDown={(e) => e.key === 'Escape' && cancelEditModal()}
                    autoFocus
                    style={{ padding: '5px', width: '100%', border: '1px solid #ced4da', borderRadius: '4px' }}
                  />
                ) : (
                  <span onDoubleClick={() => startEditingModal('status', car.status)} style={{ fontSize: '14px', color: '#495057' }}>
                    {car.status || 'N/A'}
                  </span>
                )}
              </div>
              <div>
                <strong style={{ fontSize: '14px', color: '#495057' }}>Stage: </strong>
                <div style={{ display: 'flex', gap: '5px', marginTop: '5px' }}>
                  {stageOptions.map((stage) => (
                    <button
                      key={stage}
                      onClick={() => handleStageChange(stage)}
                      style={{
                        padding: '5px 10px',
                        backgroundColor: car.stage === stage ? '#007bff' : '#e9ecef',
                        color: car.stage === stage ? 'white' : '#495057',
                        border: 'none',
                        cursor: 'pointer',
                        borderRadius: '4px',
                        fontSize: '12px',
                      }}
                    >
                      {stage}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Next Destinations Section */}
          <div style={{ marginBottom: '20px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#343a40', marginBottom: '10px' }}>
              Next Destinations
              <button
                onClick={() => setShowNextEditor(true)}
                style={{
                  marginLeft: '10px',
                  padding: '5px 10px',
                  backgroundColor: '#007bff',
                  color: 'white',
                  border: 'none',
                  cursor: 'pointer',
                  borderRadius: '4px',
                  fontSize: '12px',
                }}
              >
                Edit
              </button>
            </h3>
            {car.next && car.next.length > 0 ? (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                <thead>
                  <tr style={{ backgroundColor: '#e8ecef' }}>
                    <th style={{ border: '1px solid #dee2e6', padding: '8px', textAlign: 'left' }}>Location</th>
                    <th style={{ border: '1px solid #dee2e6', padding: '8px', textAlign: 'left' }}>Created</th>
                  </tr>
                </thead>
                <tbody>
                  {car.next.map((entry, index) => (
                    <tr key={index}>
                      <td style={{ border: '1px solid #dee2e6', padding: '8px' }}>
                        <span style={{ fontSize: '14px', color: '#495057' }}>{entry.location || 'N/A'}</span>
                      </td>
                      <td style={{ border: '1px solid #dee2e6', padding: '8px' }}>
                        <span style={{ fontSize: '14px', color: '#495057' }}>
                          {new Date(entry.created).toLocaleDateString()}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p style={{ fontSize: '14px', color: '#6c757d' }}>No Next Destinations</p>
            )}
          </div>

          {/* What It Needs Section */}
          <div style={{ marginBottom: '20px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#343a40', marginBottom: '10px' }}>What It Needs</h3>
            {car.checklist && car.checklist.length > 0 ? (
              <ul style={{ listStyleType: 'none', padding: 0, margin: 0 }}>
                {car.checklist.map((item, index) => (
                  <li key={index} style={{ marginBottom: '8px', display: 'flex', alignItems: 'center' }}>
                    {editingField === `checklist-${index}` ? (
                      <input
                        type="text"
                        value={editValue}
                        onChange={handleEditChangeModal}
                        onBlur={() => {
                          handleChecklistEdit(index, editValue);
                          setEditingField(null);
                          setEditValue('');
                        }}
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            handleChecklistEdit(index, editValue);
                            setEditingField(null);
                            setEditValue('');
                          }
                        }}
                        onKeyDown={(e) => e.key === 'Escape' && cancelEditModal()}
                        autoFocus
                        style={{ padding: '5px', width: '70%', border: '1px solid #ced4da', borderRadius: '4px' }}
                      />
                    ) : (
                      <span onDoubleClick={() => startEditingModal(`checklist-${index}`, item)} style={{ fontSize: '14px', color: '#495057', flex: 1 }}>
                        {item}
                      </span>
                    )}
                    <button
                      onClick={() => handleRemoveChecklistItem(index)}
                      style={{
                        padding: '5px 10px',
                        backgroundColor: '#dc3545',
                        color: 'white',
                        border: 'none',
                        cursor: 'pointer',
                        borderRadius: '4px',
                        fontSize: '12px',
                        marginLeft: '10px',
                      }}
                    >
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p style={{ fontSize: '14px', color: '#6c757d' }}>No Tasks</p>
            )}
            <div style={{ marginTop: '10px', display: 'flex', gap: '10px' }}>
              <input
                type="text"
                value={newChecklistItem}
                onChange={(e) => setNewChecklistItem(e.target.value)}
                placeholder="Add new task"
                style={{ padding: '5px', flex: 1, border: '1px solid #ced4da', borderRadius: '4px' }}
              />
              <button
                type="button"
                onClick={handleAddChecklistItem}
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
                Add Task
              </button>
            </div>
          </div>

          {/* Photos Section */}
          <div style={{ marginBottom: '20px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#343a40', marginBottom: '10px' }}>Photos</h3>
            {existingPhotos.length > 0 ? (
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                {existingPhotos.map((photo, index) => (
                  <Photo
                    key={index}
                    photo={photo}
                    index={index}
                    movePhoto={movePhoto}
                    deletePhoto={handleDeletePhoto}
                    rego={car.rego}
                  />
                ))}
              </div>
            ) : (
              <p style={{ fontSize: '14px', color: '#6c757d' }}>No Photos</p>
            )}
            <div style={{ marginTop: '10px', display: 'flex', gap: '10px' }}>
              <input
                type="file"
                multiple
                onChange={handleFileChange}
                style={{ padding: '5px', flex: 1 }}
              />
              <button
                onClick={handleAddPhotos}
                style={{
                  padding: '5px 10px',
                  backgroundColor: '#28a745',
                  color: 'white',
                  border: 'none',
                  cursor: 'pointer',
                  borderRadius: '4px',
                  fontSize: '12px',
                }}
              >
                Add Photos
              </button>
            </div>
            {newPhotos.length > 0 && (
              <div>
                <h4>New Photos to Upload:</h4>
                <ul>
                  {newPhotos.map((photo, index) => (
                    <li key={index}>
                      {photo.name}
                      <button type="button" onClick={() => setNewPhotos(newPhotos.filter((_, i) => i !== index))}>
                        Remove
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* History Section */}
          <div style={{ marginBottom: '20px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#343a40', marginBottom: '10px' }}>History</h3>
            {car.history && car.history.length > 0 ? (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                <thead>
                  <tr style={{ backgroundColor: '#e8ecef' }}>
                    <th style={{ border: '1px solid #dee2e6', padding: '8px', textAlign: 'left' }}>Location</th>
                    <th style={{ border: '1px solid #dee2e6', padding: '8px', textAlign: 'left' }}>Start Date</th>
                    <th style={{ border: '1px solid #dee2e6', padding: '8px', textAlign: 'left' }}>End Date</th>
                    <th style={{ border: '1px solid #dee2e6', padding: '8px', textAlign: 'left' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {car.history.map((entry, index) => (
                    <tr key={index}>
                      <td
                        style={{ border: '1px solid #dee2e6', padding: '8px' }}
                        onDoubleClick={() => startEditingHistory(index, 'location', entry.location)}
                      >
                        {editingHistory && editingHistory.index === index && editingHistory.field === 'location' ? (
                          <input
                            type="text"
                            value={editValue}
                            onChange={handleHistoryEditChange}
                            onBlur={saveHistoryEdit}
                            onKeyPress={(e) => e.key === 'Enter' && saveHistoryEdit()}
                            onKeyDown={(e) => e.key === 'Escape' && cancelHistoryEdit()}
                            autoFocus
                            style={{ padding: '5px', width: '100%', border: '1px solid #ced4da', borderRadius: '4px' }}
                          />
                        ) : (
                          <span style={{ fontSize: '14px', color: '#495057' }}>{entry.location || 'N/A'}</span>
                        )}
                      </td>
                      <td
                        style={{ border: '1px solid #dee2e6', padding: '8px' }}
                        onDoubleClick={() => startEditingHistory(index, 'dateAdded', entry.dateAdded)}
                      >
                        {editingHistory && editingHistory.index === index && editingHistory.field === 'dateAdded' ? (
                          <input
                            type="date"
                            value={editValue}
                            onChange={handleHistoryEditChange}
                            onBlur={saveHistoryEdit}
                            onKeyPress={(e) => e.key === 'Enter' && saveHistoryEdit()}
                            onKeyDown={(e) => e.key === 'Escape' && cancelHistoryEdit()}
                            autoFocus
                            style={{ padding: '5px', width: '100%', border: '1px solid #ced4da', borderRadius: '4px' }}
                          />
                        ) : (
                          <span style={{ fontSize: '14px', color: '#495057' }}>
                            {entry.dateAdded ? new Date(entry.dateAdded).toLocaleDateString() : 'N/A'}
                          </span>
                        )}
                      </td>
                      <td
                        style={{ border: '1px solid #dee2e6', padding: '8px' }}
                        onDoubleClick={() => startEditingHistory(index, 'dateLeft', entry.dateLeft)}
                      >
                        {editingHistory && editingHistory.index === index && editingHistory.field === 'dateLeft' ? (
                          <input
                            type="date"
                            value={editValue}
                            onChange={handleHistoryEditChange}
                            onBlur={saveHistoryEdit}
                            onKeyPress={(e) => e.key === 'Enter' && saveHistoryEdit()}
                            onKeyDown={(e) => e.key === 'Escape' && cancelHistoryEdit()}
                            autoFocus
                            style={{ padding: '5px', width: '100%', border: '1px solid #ced4da', borderRadius: '4px' }}
                          />
                        ) : (
                          <span style={{ fontSize: '14px', color: '#495057' }}>
                            {entry.dateLeft ? new Date(entry.dateLeft).toLocaleDateString() : 'Still There'}
                          </span>
                        )}
                      </td>
                      <td style={{ border: '1px solid #dee2e6', padding: '8px' }}>
                        <button
                          onClick={() => handleDeleteHistoryEntry(index)}
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
                  ))}
                </tbody>
              </table>
            ) : (
              <p style={{ fontSize: '14px', color: '#6c757d' }}>No History</p>
            )}
          </div>

          {/* Notes Section */}
          <div style={{ marginBottom: '20px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#343a40', marginBottom: '10px' }}>Notes</h3>
            {editingField === 'notes' ? (
              <textarea
                value={editValue}
                onChange={handleEditChangeModal}
                onBlur={saveEditModal}
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    saveEditModal();
                  }
                }}
                onKeyDown={(e) => e.key === 'Escape' && cancelEditModal()}
                autoFocus
                style={{
                  padding: '5px',
                  width: '100%',
                  height: '80px',
                  border: '1px solid #ced4da',
                  borderRadius: '4px',
                  resize: 'vertical',
                  fontSize: '14px',
                  color: '#495057',
                }}
              />
            ) : (
              <div
                onDoubleClick={() => startEditingModal('notes', car.notes)}
                style={{
                  padding: '5px',
                  minHeight: '80px',
                  border: '1px solid #dee2e6',
                  borderRadius: '4px',
                  fontSize: '14px',
                  color: car.notes ? '#495057' : '#6c757d',
                  whiteSpace: 'pre-wrap', // Preserve line breaks
                }}
              >
                {car.notes || 'No Notes'}
              </div>
            )}
          </div>

          {/* Action Buttons */}
          {isModal && (
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                onClick={onClose}
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
            </div>
          )}
        </div>
      </div>

      {/* Next Destinations Editor Modal */}
      {showNextEditor && (
        <NextDestinationsEditor
          carId={carId}
          nextDestinations={car.next}
          onSave={() => {
            fetchCarWithoutRefresh();
            setShowNextEditor(false);
          }}
          onCancel={handleCloseNextEditor}
          fetchCars={fetchCarWithoutRefresh}
          onSetCurrentLocation={handleSetCurrentLocation}
        />
      )}
    </DndProvider>
  );
};

export default CarProfileModal;