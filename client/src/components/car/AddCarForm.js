import React, { useState, useEffect } from 'react';
import axios from '../../utils/axiosConfig';

const AddCarForm = ({ onAdd, onClose, initialValues = {} }) => {
  const [formData, setFormData] = useState({
    rego: initialValues.rego || '',
    make: initialValues.make || '',
    model: initialValues.model || '',
    badge: initialValues.badge || '',
    year: initialValues.year || '',
    description: initialValues.description || '',
    location: initialValues.location || '',
    next: initialValues.next || '',
  });
  const [checklist, setChecklist] = useState(initialValues.checklist || []);
  const [newChecklistItem, setNewChecklistItem] = useState('');
  const [photos, setPhotos] = useState([]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleFileChange = (e) => {
    const selectedFiles = Array.from(e.target.files);
    setPhotos((prevPhotos) => [...prevPhotos, ...selectedFiles]);
  };

  const removePhoto = (index) => {
    setPhotos((prevPhotos) => prevPhotos.filter((_, i) => i !== index));
  };

  const handleAddChecklistItem = () => {
    if (newChecklistItem && !checklist.includes(newChecklistItem)) {
      setChecklist([...checklist, newChecklistItem]);
      setNewChecklistItem('');
    }
  };

  const handleRemoveChecklistItem = (item) => {
    setChecklist(checklist.filter((task) => task !== item));
  };

  const handleSubmit = async (e) => {
  e.preventDefault();
  const maxRetries = 3;
  let attempt = 0;

  while (attempt < maxRetries) {
    try {
      const token = localStorage.getItem('token');
      const formDataToSend = new FormData();
      photos.forEach((photo) => formDataToSend.append('photos', photo));
      formDataToSend.append('make', formData.make);
      formDataToSend.append('model', formData.model);
      formDataToSend.append('rego', formData.rego);
      formDataToSend.append('badge', formData.badge);
      formDataToSend.append('year', formData.year);
      formDataToSend.append('description', formData.description);
      formDataToSend.append('location', formData.location);
      formDataToSend.append('status', 'In Works');
      formDataToSend.append('next', formData.next);
      formDataToSend.append('checklist', checklist.join(','));

      await axios.post('/api/cars', formDataToSend, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        timeout: 60000, // Increased to 60 seconds
      });

      onAdd();
      setFormData({ rego: '', make: '', model: '', badge: '', year: '', description: '', location: '', next: '' });
      setChecklist([]);
      setNewChecklistItem('');
      setPhotos([]);
      onClose();
      return; // Success, exit loop
    } catch (err) {
      attempt++;
      console.error(`Attempt ${attempt} failed:`, err);
      if (attempt === maxRetries) {
        console.error('Max retries reached. Upload failed:', err);
        if (err.code === 'ECONNABORTED') {
          alert('Upload timed out after multiple attempts. Please try again with a stronger mobile signal or Wi-Fi.');
        } else {
          alert('Failed to add car: ' + (err.response?.data?.message || err.message));
        }
        return;
      }
      // Exponential backoff: wait 1s, 2s, 4s
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
    }
  }
};

  return (
    <div>
      <h2>Add New Car</h2>
      <form onSubmit={handleSubmit} style={{ maxWidth: '600px', margin: '0 auto' }}>
        <div style={{ marginBottom: '10px' }}>
          <label>Rego: </label>
          <input type="text" name="rego" value={formData.rego} onChange={handleChange} required style={{ width: '100%', padding: '5px' }} />
        </div>
        <div style={{ marginBottom: '10px' }}>
          <label>Make: </label>
          <input type="text" name="make" value={formData.make} onChange={handleChange} required style={{ width: '100%', padding: '5px' }} />
        </div>
        <div style={{ marginBottom: '10px' }}>
          <label>Model: </label>
          <input type="text" name="model" value={formData.model} onChange={handleChange} required style={{ width: '100%', padding: '5px' }} />
        </div>
        <div style={{ marginBottom: '10px' }}>
          <label>Badge: </label>
          <input type="text" name="badge" value={formData.badge} onChange={handleChange} style={{ width: '100%', padding: '5px' }} />
        </div>
        <div style={{ marginBottom: '10px' }}>
          <label>Year: </label>
          <input type="number" name="year" value={formData.year} onChange={handleChange} style={{ width: '100%', padding: '5px' }} />
        </div>
        <div style={{ marginBottom: '10px' }}>
          <label>Description: </label>
          <textarea name="description" value={formData.description} onChange={handleChange} style={{ width: '100%', padding: '5px' }} />
        </div>
        <div style={{ marginBottom: '10px' }}>
          <label>What It Needs: </label>
          <div>
            <input type="text" value={newChecklistItem} onChange={(e) => setNewChecklistItem(e.target.value)} placeholder="e.g., Oil change" style={{ padding: '5px', marginRight: '10px', width: '70%' }} />
            <button type="button" onClick={handleAddChecklistItem} style={{ padding: '5px 10px', backgroundColor: '#28a745', color: 'white', border: 'none', cursor: 'pointer' }}>Add Task</button>
          </div>
          <ul style={{ listStyleType: 'none', padding: 0, marginTop: '10px' }}>
            {checklist.map((item) => (
              <li key={item} style={{ marginBottom: '5px' }}>
                {item}
                <button type="button" onClick={() => handleRemoveChecklistItem(item)} style={{ marginLeft: '10px', backgroundColor: 'red', color: 'white', border: 'none', cursor: 'pointer', padding: '2px 5px' }}>Remove</button>
              </li>
            ))}
          </ul>
        </div>
        <div style={{ marginBottom: '10px' }}>
          <label>Location: </label>
          <input type="text" name="location" value={formData.location} onChange={handleChange} style={{ width: '100%', padding: '5px' }} />
        </div>
        <div style={{ marginBottom: '10px' }}>
          <label>Next: </label>
          <input type="text" name="next" value={formData.next} onChange={handleChange} style={{ width: '100%', padding: '5px' }} />
        </div>
        <div style={{ marginBottom: '10px' }}>
          <label>Photos: </label>
          <input type="file" name="photos" multiple onChange={handleFileChange} style={{ width: '100%', padding: '5px' }} />
          {photos.length > 0 && (
            <div>
              <h4>Selected Photos:</h4>
              <ul>
                {photos.map((photo, index) => (
                  <li key={index}>
                    {photo.name}
                    <button type="button" onClick={() => removePhoto(index)}>Remove</button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
          <button type="button" onClick={onClose} style={{ padding: '5px 10px', backgroundColor: '#dc3545', color: 'white', border: 'none', cursor: 'pointer', borderRadius: '5px' }}>Cancel</button>
          <button type="submit" style={{ padding: '5px 10px', backgroundColor: '#007bff', color: 'white', border: 'none', cursor: 'pointer', borderRadius: '5px' }}>Add Car</button>
        </div>
      </form>
    </div>
  );
};

export default AddCarForm;
