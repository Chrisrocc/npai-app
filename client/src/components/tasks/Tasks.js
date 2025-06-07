import React, { useState, useEffect, useCallback } from 'react';
import axios from '../../utils/axiosConfig';
import HamburgerMenu from '../shared/HamburgerMenu';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { useNavigate } from 'react-router-dom';
import CarSelectTable from '../shared/CarSelectTable';

const Tasks = () => {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editingField, setEditingField] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [editTaskId, setEditTaskId] = useState(null);
  const [editCarItemId, setEditCarItemId] = useState(null);
  const [newTask, setNewTask] = useState({ name: '', dayTime: '', carItems: [] });
  const [showAddModal, setShowAddModal] = useState(false);
  const [showCarSelectModal, setShowCarSelectModal] = useState(false);
  const navigate = useNavigate();

  const fetchTasks = useCallback(async () => {
    try {
      console.log('Fetching tasks...');
      const response = await axios.get('/api/tasks');
      console.log('Tasks response:', response.data);
      if (!Array.isArray(response.data)) {
        throw new Error('Expected an array of tasks, but received: ' + JSON.stringify(response.data));
      }
      setTasks(response.data);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching tasks:', err);
      if (err.response?.status === 401 || err.response?.status === 403) {
        navigate('/login');
      } else {
        setError('Failed to fetch tasks: ' + err.message);
        setLoading(false);
      }
    }
  }, [navigate]);

  useEffect(() => {
    fetchTasks();
    const interval = setInterval(() => {
      fetchTasks();
    }, 10000); // Poll every 10 seconds

    return () => clearInterval(interval);
  }, [fetchTasks]);

  const startEditing = (taskId, field, carItemId) => {
    setEditingField({ taskId, field, carItemId });
    setEditTaskId(taskId);
    setEditCarItemId(carItemId);
    if (field === 'car') {
      setShowCarSelectModal(true);
    }
  };

  const handleEditChange = (e) => {
    setEditValue(e.target.value);
  };

  const saveEdit = async () => {
    if (!editingField || !editTaskId) return;
    try {
      const updatedTask = tasks.find(task => task._id === editTaskId);
      let updateData = {};

      if (editingField.field === 'name') {
        updateData.name = editValue;
        updateData.dayTime = updatedTask.dayTime;
        updateData.carItems = updatedTask.carItems.map(item => ({
          car: item.car ? item.car._id : null,
          carDetails: item.carDetails,
          comment: item.comment
        }));
      } else if (editingField.field === 'dayTime') {
        updateData.dayTime = editValue;
        updateData.name = updatedTask.name;
        updateData.carItems = updatedTask.carItems.map(item => ({
          car: item.car ? item.car._id : null,
          carDetails: item.carDetails,
          comment: item.comment
        }));
      } else if (editingField.field === 'comments') {
        updateData.name = updatedTask.name;
        updateData.dayTime = updatedTask.dayTime;
        updateData.carItems = updatedTask.carItems.map(item => ({
          car: item.car ? item.car._id : null,
          carDetails: item.carDetails,
          comment: item._id === editCarItemId ? editValue : item.comment
        }));
      }

      const response = await axios.put(`/api/tasks/${editTaskId}`, updateData);
      console.log('Update task response:', response.data);

      setTasks(prevTasks =>
        prevTasks.map(task =>
          task._id === editTaskId ? { ...task, ...response.data } : task
        )
      );

      setEditingField(null);
      setEditTaskId(null);
      setEditCarItemId(null);
      setEditValue('');
      setShowCarSelectModal(false);
    } catch (err) {
      console.error('Error updating task:', err);
      alert('Failed to update task: ' + err.message);
    }
  };

  const cancelEdit = () => {
    setEditingField(null);
    setEditTaskId(null);
    setEditCarItemId(null);
    setEditValue('');
    setShowCarSelectModal(false);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this task?')) {
      try {
        console.log('Deleting task:', id);
        const response = await axios.delete(`/api/tasks/${id}`);
        console.log('Delete task response:', response.data);
        fetchTasks();
      } catch (err) {
        console.error('Error deleting task:', err);
        alert('Failed to delete task: ' + err.message);
      }
    }
  };

  const handleAddTask = async () => {
    try {
      const response = await axios.post('/api/tasks', newTask);
      console.log('Add task response:', response.data);
      setNewTask({ name: '', dayTime: '', carItems: [] });
      setShowAddModal(false);
      setShowCarSelectModal(false);
      fetchTasks();
    } catch (err) {
      console.error('Error adding task:', err);
      alert('Failed to add task: ' + err.message);
    }
  };

  const handleSelectCar = async (carId) => {
    console.log('Selected car ID:', carId);
    if (editingField && editingField.field === 'car') {
      // When editing a task, update the car directly
      try {
        const updatedTask = tasks.find(task => task._id === editTaskId);
        const updateData = {
          name: updatedTask.name,
          dayTime: updatedTask.dayTime,
          carItems: updatedTask.carItems.map(item => {
            if (item._id === editCarItemId) {
              return {
                ...item,
                car: carId,
                carDetails: null // Let the backend populate carDetails, or fetch the car data if needed
              };
            }
            return {
              car: item.car ? item.car._id : null,
              carDetails: item.carDetails,
              comment: item.comment
            };
          })
        };

        const response = await axios.put(`/api/tasks/${editTaskId}`, updateData);
        console.log('Update task with new car response:', response.data);

        // Fetch the updated task list to ensure the UI reflects the latest data
        await fetchTasks();

        // Reset editing state and close the modal
        setEditingField(null);
        setEditTaskId(null);
        setEditCarItemId(null);
        setShowCarSelectModal(false);
      } catch (err) {
        console.error('Error updating task with new car:', err);
        alert('Failed to update task with new car: ' + err.message);
      }
    } else {
      // When adding a new task, fetch the car details and update newTask
      try {
        const response = await axios.get(`/api/cars/${carId}`);
        const selectedCar = response.data;
        console.log('Fetched car details:', selectedCar);

        setNewTask({
          ...newTask,
          carItems: [
            {
              car: selectedCar._id,
              carDetails: {
                make: selectedCar.make,
                model: selectedCar.model,
                badge: selectedCar.badge,
                description: selectedCar.description,
                rego: selectedCar.rego
              },
              comment: ''
            }
          ]
        });
        setShowCarSelectModal(false);
      } catch (err) {
        console.error('Error fetching car details:', err);
        alert('Failed to fetch car details: ' + err.message);
      }
    }
  };

  const getTaskRowColor = (dayTime, dateCreated) => {
    const now = new Date('2025-06-07T09:15:00+10:00'); // Current date and time: June 07, 2025, 09:15 AM AEST
    let isPastDue = false;
    let isOverTwoHours = false;

    // Check if the task is past its due date
    if (dayTime) {
      const taskDate = new Date(dayTime);
      isPastDue = taskDate < now;
    }

    // Check if the task is more than 2 hours past creation
    if (dateCreated) {
      const createdDate = new Date(dateCreated);
      const diffTime = now - createdDate; // Difference in milliseconds
      const diffHours = diffTime / (1000 * 60 * 60); // Convert to hours
      isOverTwoHours = diffHours > 2;
    }

    // Red if past due OR more than 2 hours past creation
    if (isPastDue || isOverTwoHours) {
      return '#ffe6e6'; // Light red
    }

    // Yellow if due today
    if (dayTime) {
      const taskDate = new Date(dayTime);
      const today = new Date(now);
      today.setHours(0, 0, 0, 0); // Start of today
      const taskDay = new Date(taskDate);
      taskDay.setHours(0, 0, 0, 0); // Start of task's day
      const diffDays = Math.ceil((taskDay - today) / (1000 * 60 * 60 * 24));
      if (diffDays === 0) {
        return '#fff3cd'; // Light yellow
      }
    }

    // Green if due in the future
    if (dayTime) {
      const taskDate = new Date(dayTime);
      const today = new Date(now);
      today.setHours(0, 0, 0, 0);
      const taskDay = new Date(taskDate);
      taskDay.setHours(0, 0, 0, 0);
      const diffDays = Math.ceil((taskDay - today) / (1000 * 60 * 60 * 24));
      if (diffDays > 0) {
        return '#e6f4ea'; // Light green
      }
    }

    // Default: white
    return '#ffffff';
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

  const renderTaskTable = () => {
    const rows = tasks.flatMap(task =>
      (task.carItems || []).map((carItem, index) => ({
        ...task,
        car: carItem.car,
        carDetails: carItem.carDetails,
        comment: carItem.comment,
        carItemId: carItem._id,
        rowKey: `${task._id}-${index}`
      }))
    );

    return (
      <div style={{ padding: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '10px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: '600', color: '#343a40', margin: 0, flexGrow: 1 }}>Tasks</h2>
          <button
            onClick={() => {
              setNewTask({ name: '', dayTime: '', carItems: [] });
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
              <th style={{ padding: '6px', border: '1px solid #dee2e6', textAlign: 'left' }}>Task</th>
              <th style={{ padding: '6px', border: '1px solid #dee2e6', textAlign: 'left' }}>Car</th>
              <th style={{ padding: '6px', border: '1px solid #dee2e6', textAlign: 'left' }}>Day/Time</th>
              <th style={{ padding: '6px', border: '1px solid #dee2e6', textAlign: 'left' }}>Date Created</th>
              <th style={{ padding: '6px', border: '1px solid #dee2e6', textAlign: 'left' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(row => (
              <tr
                key={row.rowKey}
                style={{
                  backgroundColor: getTaskRowColor(row.dayTime, row.dateCreated),
                  transition: 'background-color 0.2s',
                  height: '50px',
                }}
              >
                <td
                  style={{ padding: '6px', border: '1px solid #dee2e6', verticalAlign: 'middle' }}
                  onDoubleClick={() => startEditing(row._id, 'name', row.carItemId)}
                >
                  {editingField && editingField.taskId === row._id && editingField.field === 'name' ? (
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
                    row.name || '-'
                  )}
                </td>
                <td
                  style={{ padding: '6px', border: '1px solid #dee2e6', minWidth: '300px', verticalAlign: 'middle' }}
                  onDoubleClick={() => {
                    startEditing(row._id, 'car', row.carItemId);
                  }}
                >
                  {editingField && editingField.taskId === row._id && editingField.field === 'car' && editingField.carItemId === row.carItemId && showCarSelectModal ? (
                    <div style={{ position: 'relative' }}>
                      <button
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
                        Select Car
                      </button>
                    </div>
                  ) : row.car ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{ flexShrink: 0 }}>
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
                          {`${row.carDetails.make || '-'} ${row.carDetails.model || ''}${row.carDetails.badge ? ` ${row.carDetails.badge}` : ''}`.trim()}
                        </div>
                      ) : (
                        '-'
                      )}
                    </div>
                  )}
                </td>
                <td
                  style={{ padding: '6px', border: '1px solid #dee2e6', verticalAlign: 'middle' }}
                  onDoubleClick={() => startEditing(row._id, 'dayTime', row.carItemId)}
                >
                  {editingField && editingField.taskId === row._id && editingField.field === 'dayTime' ? (
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
                    row.dayTime || '-'
                  )}
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

  if (loading) return <div style={{ textAlign: 'center', padding: '20px' }}>Loading...</div>;
  if (error) return <div style={{ textAlign: 'center', padding: '20px', color: '#dc3545' }}>{error}</div>;

  return (
    <DndProvider backend={HTML5Backend}>
      <>
        <div style={{ padding: '20px', fontFamily: "'Roboto', sans-serif", backgroundColor: '#fff', minHeight: '100vh' }}>
          <HamburgerMenu />
          <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#343a40', textAlign: 'center', marginBottom: '20px' }}>
            Tasks
          </h1>
          {renderTaskTable()}
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
            onClick={() => {
              setShowAddModal(false);
              setShowCarSelectModal(false);
            }}
          >
            <div
              style={{
                backgroundColor: '#fff',
                padding: '20px',
                borderRadius: '8px',
                width: '400px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <h2 style={{ fontSize: '18px', fontWeight: '600', color: '#343a40', marginBottom: '15px' }}>
                Add New Task
              </h2>
              <div style={{ marginBottom: '10px' }}>
                <label style={{ display: 'block', fontSize: '14px', color: '#495057', marginBottom: '5px' }}>
                  Task Name
                </label>
                <input
                  type="text"
                  value={newTask.name}
                  onChange={(e) => setNewTask({ ...newTask, name: e.target.value })}
                  style={{ width: '100%', padding: '8px', border: '1px solid #ced4da', borderRadius: '4px' }}
                />
              </div>
              <div style={{ marginBottom: '10px' }}>
                <label style={{ display: 'block', fontSize: '14px', color: '#495057', marginBottom: '5px' }}>
                  Day/Time
                </label>
                <input
                  type="text"
                  value={newTask.dayTime}
                  onChange={(e) => setNewTask({ ...newTask, dayTime: e.target.value })}
                  style={{ width: '100%', padding: '8px', border: '1px solid #ced4da', borderRadius: '4px' }}
                />
              </div>
              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', fontSize: '14px', color: '#495057', marginBottom: '5px' }}>
                  Car
                </label>
                <button
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
                  {newTask.carItems.length > 0 && newTask.carItems[0].carDetails
                    ? `${newTask.carItems[0].carDetails.make} ${newTask.carItems[0].carDetails.model}${newTask.carItems[0].carDetails.rego ? ` (Rego: ${newTask.carItems[0].carDetails.rego})` : ''}`
                    : 'Select Car'}
                </button>
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  onClick={handleAddTask}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: '#007bff',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    transition: 'background-color 0.2s',
                  }}
                  onMouseEnter={(e) => (e.target.style.backgroundColor = '#0056b3')}
                  onMouseLeave={(e) => (e.target.style.backgroundColor = '#007bff')}
                >
                  Save
                </button>
                <button
                  onClick={() => {
                    setShowAddModal(false);
                    setShowCarSelectModal(false);
                  }}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: '#6c757d',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    transition: 'background-color 0.2s',
                  }}
                  onMouseEnter={(e) => (e.target.style.backgroundColor = '#5a6268')}
                  onMouseLeave={(e) => (e.target.style.backgroundColor = '#6c757d')}
                >
                  Cancel
                </button>
              </div>
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
      </>
    </DndProvider>
  );
};

export default Tasks;