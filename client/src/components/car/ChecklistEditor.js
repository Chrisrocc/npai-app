import React, { useState, useEffect } from 'react';
import axios from '../../utils/axiosConfig';

const ChecklistEditor = ({ carId, checklist, onSave, onCancel, fetchCars }) => {
  const [localChecklist, setLocalChecklist] = useState(checklist || []);
  const [newItem, setNewItem] = useState('');
  const [editingIndex, setEditingIndex] = useState(null);
  const [editValue, setEditValue] = useState('');

  // Sync local state with prop changes
  useEffect(() => {
    setLocalChecklist(checklist || []);
  }, [checklist]);

  const handleAddItem = async () => {
    if (!newItem.trim()) return;

    try {
      const updatedChecklist = [...localChecklist, newItem.trim()];
      const response = await axios.put(`/api/cars/${carId}`, { checklist: updatedChecklist });
      setNewItem('');
      setLocalChecklist(response.data.checklist);
      if (fetchCars) fetchCars();
    } catch (err) {
      console.error('Error adding checklist item:', err);
      alert('Failed to add checklist item');
    }
  };

  const handleDeleteItem = async (index) => {
    try {
      const updatedChecklist = localChecklist.filter((_, i) => i !== index);
      const response = await axios.put(`/api/cars/${carId}`, { checklist: updatedChecklist });
      setLocalChecklist(response.data.checklist);
      if (fetchCars) fetchCars();
    } catch (err) {
      console.error('Error deleting checklist item:', err);
      alert('Failed to delete checklist item');
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

    const updatedChecklist = [...localChecklist];
    updatedChecklist[editingIndex] = editValue.trim();

    try {
      const response = await axios.put(`/api/cars/${carId}`, { checklist: updatedChecklist });
      setLocalChecklist(response.data.checklist);
      setEditingIndex(null);
      setEditValue('');
      if (fetchCars) fetchCars();
    } catch (err) {
      console.error('Error updating checklist item:', err);
      alert('Failed to update checklist item');
    }
  };

  const cancelEdit = () => {
    setEditingIndex(null);
    setEditValue('');
  };

  const handleSave = () => {
    onSave();
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ width: '500px', maxHeight: '80vh', overflowY: 'auto' }}>
        <h3>Edit Checklist</h3>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
          <thead>
            <tr style={{ backgroundColor: '#e8ecef' }}>
              <th style={{ border: '1px solid #dee2e6', padding: '8px', textAlign: 'left' }}>Item</th>
              <th style={{ border: '1px solid #dee2e6', padding: '8px', textAlign: 'left' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {localChecklist.length > 0 ? (
              localChecklist.map((item, index) => (
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
                      <span onDoubleClick={() => startEditing(index, item)} style={{ fontSize: '14px', color: '#495057' }}>
                        {item || 'N/A'}
                      </span>
                    )}
                  </td>
                  <td style={{ border: '1px solid #dee2e6', padding: '8px' }}>
                    <button
                      onClick={() => handleDeleteItem(index)}
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
                <td colSpan="2" style={{ textAlign: 'center', padding: '8px', color: '#6c757d' }}>
                  No Checklist Items
                </td>
              </tr>
            )}
          </tbody>
        </table>
        <div style={{ marginTop: '10px', display: 'flex', gap: '10px' }}>
          <input
            type="text"
            value={newItem}
            onChange={(e) => setNewItem(e.target.value)}
            placeholder="Add new checklist item"
            style={{ padding: '5px', flex: 1, border: '1px solid #ced4da', borderRadius: '4px' }}
          />
          <button
            onClick={handleAddItem}
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

export default ChecklistEditor;