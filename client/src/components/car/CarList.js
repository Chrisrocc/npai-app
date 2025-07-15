import React, { useState, useEffect, useCallback } from 'react';
import axios from '../../utils/axiosConfig';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { useNavigate } from 'react-router-dom';
import HamburgerMenu from '../shared/HamburgerMenu';
import ManualVerification from '../verification/ManualVerification';
import CarProfileModal from './CarProfileModal';
import AddCarModal from './AddCarModal';
import CarTable from './CarTable';
import CarSelectTable from '../shared/CarSelectTable';
import NextDestinationsEditor from './NextDestinationsEditor';
import ChecklistEditor from './ChecklistEditor';
import { sortCars, filterCars } from '../../utils/carListUtils';
import './CarList.css';

const CarList = ({ onSelectCar, singleTable = false, prePopulateSearch = '' }) => {
  const [cars, setCars] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editingField, setEditingField] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [editingNextCarId, setEditingNextCarId] = useState(null);
  const [editingChecklistCarId, setEditingChecklistCarId] = useState(null);
  const [selectedStages, setSelectedStages] = useState(['In Works', 'In Works/Online', 'Online', 'Sold']);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: null });
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddCarModal, setShowAddCarModal] = useState(false);
  const [showCarProfileModal, setShowCarProfileModal] = useState(false);
  const [showManualVerificationModal, setShowManualVerificationModal] = useState(false);
  const [selectedCarId, setSelectedCarId] = useState(null);
  const [verificationCount, setVerificationCount] = useState(0);
  const [showPhotos, setShowPhotos] = useState(true);
  const [showPopup, setShowPopup] = useState(false);
  const [newCars, setNewCars] = useState([]);
  const [activeTab, setActiveTab] = useState('inventory');
  const [plans, setPlans] = useState([]);
  const [showAddCarForPlanModal, setShowAddCarForPlanModal] = useState(false);
  const [showSelectCarModal, setShowSelectCarModal] = useState(false);
  const [planToIdentify, setPlanToIdentify] = useState(null);

  const navigate = useNavigate();

  const apiUrl = process.env.REACT_APP_API_URL || '';

  const fetchCars = useCallback(async () => {
    try {
      const response = await axios.get(`${apiUrl}/api/cars`);
      const fetchedCars = response.data;
      const updatedCars = await Promise.all(fetchedCars.map(async car => {
        if (car.pendingLocationUpdate && car.pendingLocationUpdate.message) {
          const message = car.pendingLocationUpdate.message;
          const statusMatch = message.match(/will be ready at \S+ (?:at )?(.+)$/i);
          const telegramStatus = statusMatch ? statusMatch[1] : car.status;
          await axios.put(`${apiUrl}/api/cars/${car._id}`, {
            ...car,
            location: car.pendingLocationUpdate.location || car.location,
            status: telegramStatus,
            pendingLocationUpdate: null,
          });
          return {
            ...car,
            location: car.pendingLocationUpdate.location || car.location,
            status: telegramStatus,
            pendingLocationUpdate: null,
          };
        }
        return car;
      }));
      console.log('Fetched cars:', updatedCars.map(c => ({ _id: c._id, make: c.make, model: c.model, stage: c.stage, archived: c.archived })));
      setCars(updatedCars);
      setLoading(false);
    } catch (err) {
      if (err.response?.status === 401 || err.response?.status === 403) {
        navigate('/login');
      } else {
        setError('Failed to fetch cars: ' + err.message);
        setLoading(false);
      }
    }
  }, [navigate]);

  const fetchVerificationCount = useCallback(async () => {
    try {
      const response = await axios.get(`${apiUrl}/api/manualverifications`);
      const count = response.data.length;
      setVerificationCount(count);
      console.log(`Fetched verification count: ${count}`);
    } catch (err) {
      console.error('Error fetching verification count:', err);
      if (err.response?.status === 401 || err.response?.status === 403) {
        navigate('/login');
      }
      setVerificationCount(0);
    }
  }, [navigate]);

  const fetchPlans = useCallback(async () => {
    try {
      const response = await axios.get(`${apiUrl}/api/plans`);
      setPlans(Array.isArray(response.data) ? response.data : []);
    } catch (err) {
      console.error('Error fetching plans:', err);
      if (err.response?.status === 401 || err.response?.status === 403) {
        navigate('/login');
      }
      setPlans([]);
    }
  }, [navigate]);

  useEffect(() => {
    fetchCars();
    fetchVerificationCount();
    fetchPlans();
    const interval = setInterval(() => {
      fetchCars();
      fetchVerificationCount();
      fetchPlans();
    }, 10000);

    return () => clearInterval(interval);
  }, [fetchCars, fetchVerificationCount, fetchPlans]);

  const handleCsvUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await axios.post(`${apiUrl}/api/cars/upload-csv`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      setNewCars(response.data.newCars);
      setShowPopup(true);
      fetchCars();
    } catch (err) {
      alert('Failed to upload CSV: ' + (err.response?.data?.message || err.message));
    }
  };

  const handleVerificationComplete = async () => {
    await fetchCars();
    await fetchVerificationCount();
  };

  const handlePlanHappened = async (plan) => {
    if (plan.identifiedCar) {
      try {
        const [, , , , , , newLocation] = plan.data;
        await axios.put(`${apiUrl}/api/cars/${plan.identifiedCar.id}`, {
          location: newLocation,
          status: '',
        });
        await axios.put(`${apiUrl}/api/plans/${plan.id}`, { status: 'happened' });
        fetchCars();
        fetchPlans();
        alert('Plan executed successfully');
      } catch (err) {
        alert('Failed to execute plan: ' + (err.response?.data?.message || err.message));
      }
    }
  };

  const handlePlanDidntHappen = async (plan) => {
    try {
      await axios.put(`${apiUrl}/api/plans/${plan.id}`, { status: 'didnt_happen' });
      fetchPlans();
    } catch (err) {
      alert('Failed to dismiss plan: ' + (err.response?.data?.message || err.message));
    }
  };

  const handleAddCarForPlan = (plan) => {
    setPlanToIdentify(plan);
    setShowAddCarForPlanModal(true);
  };

  const handleSelectCarForPlan = (plan) => {
    setPlanToIdentify(plan);
    setShowSelectCarModal(true);
  };

  const handleSelectCar = async (selectedCarIds) => {
    try {
      const carId = selectedCarIds[0];
      const response = await axios.get(`${apiUrl}/api/cars/${carId}`);
      const car = response.data;
      await axios.put(`${apiUrl}/api/plans/${planToIdentify.id}`, {
        identifiedCar: {
          id: car._id,
          make: car.make,
          model: car.model,
          rego: car.rego,
          description: car.description,
        },
      });
      fetchPlans();
      setShowSelectCarModal(false);
      setPlanToIdentify(null);
    } catch (err) {
      alert('Failed to select car: ' + (err.response?.data?.message || err.message));
    }
  };

  const handleAddCarSubmit = async (newCar) => {
    try {
      const response = await axios.post(`${apiUrl}/api/cars`, newCar);
      const car = response.data;
      await axios.put(`${apiUrl}/api/plans/${planToIdentify.id}`, {
        identifiedCar: {
          id: car._id,
          make: car.make,
          model: car.model,
          rego: car.rego,
          description: car.description,
        },
      });
      fetchCars();
      fetchPlans();
      setShowAddCarForPlanModal(false);
      setPlanToIdentify(null);
    } catch (err) {
      alert('Failed to add car: ' + (err.response?.data?.message || err.message));
    }
  };

  const handleDelete = async (id) => {
    try {
      await axios.delete(`${apiUrl}/api/cars/${id}`);
      fetchCars();
    } catch (err) {
      console.error('Error deleting car:', err);
      alert('Failed to delete car');
    }
  };

  const handleOpenProfile = (id) => {
    if (onSelectCar) {
      onSelectCar(id);
    } else {
      setSelectedCarId(id);
      setShowCarProfileModal(true);
    }
  };

  const startEditing = (carId, field, value, event) => {
    event.stopPropagation();
    if (field === 'next') {
      setEditingNextCarId(carId);
    } else if (field === 'checklist') {
      setEditingChecklistCarId(carId);
    } else {
      setEditingField({ carId, field });
      setEditValue(value || '');
    }
  };

  const handleEditChange = (e) => {
    setEditValue(e.target.value);
  };

  const saveEdit = async (carId) => {
    if (!editingField) return;
    const payload = {};
    payload[editingField.field] = editValue.trim();
    if (editingField.field === 'location') {
      payload.status = '';
    }
    // Client-side validation for rego
    if (editingField.field === 'rego') {
      const regoPattern = /^[a-zA-Z0-9]{1,6}$/;
      if (!regoPattern.test(payload.rego)) {
        alert('Rego must be 1-6 alphanumeric characters');
        return;
      }
    }
    try {
      await axios.put(`${apiUrl}/api/cars/${carId}`, payload, {
        headers: { 'Content-Type': 'application/json' },
      });
      await fetchCars();
    } catch (err) {
      console.error('Error updating car:', err);
      alert('Failed to update car: ' + (err.response?.data?.message || err.message));
    } finally {
      setEditingField(null);
      setEditValue('');
    }
  };

  const cancelEdit = () => {
    setEditingField(null);
    setEditValue('');
  };

  const handleCloseNextEditor = () => {
    setEditingNextCarId(null);
  };

  const handleCloseChecklistEditor = () => {
    setEditingChecklistCarId(null);
  };

  const handleStageFilter = (stage) => {
    if (selectedStages.includes(stage)) {
      setSelectedStages(selectedStages.filter((s) => s !== stage));
    } else {
      setSelectedStages([...selectedStages, stage]);
    }
  };

  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key) {
      if (sortConfig.direction === 'asc') {
        direction = 'desc';
      } else if (sortConfig.direction === 'desc') {
        direction = null;
      }
    }
    setSortConfig({ key, direction });
  };

  const togglePhotos = () => {
    setShowPhotos(!showPhotos);
  };

  const filteredCars = searchTerm
    ? cars.filter(car =>
        Object.values(car).some(value =>
          value?.toString().toLowerCase().includes(searchTerm.toLowerCase())
        )
      )
    : selectedStages.length === 0
    ? cars
    : cars.filter(car => selectedStages.includes(car.stage || 'In Works'));

  const soldCars = filteredCars.filter((car) => (car.stage || 'In Works') === 'Sold');
  const nonSoldCars = filteredCars.filter((car) => (car.stage || 'In Works') !== 'Sold');
  const sortedSoldCars = sortCars(soldCars, sortConfig);
  const sortedNonSoldCars = sortCars(nonSoldCars, sortConfig);

  const leftTableCars = [];
  const rightTableCars = [];

  sortedNonSoldCars.forEach((car, index) => {
    if (index < 30) {
      leftTableCars.push(car);
    } else if (index < 60) {
      rightTableCars.push(car);
    } else {
      if (leftTableCars.length <= rightTableCars.length) {
        leftTableCars.push(car);
      } else {
        rightTableCars.push(car);
      }
    }
  });

  const rightTableCarsWithSold = [...sortedSoldCars, ...rightTableCars];
  const combinedCarsForMobile = [...leftTableCars, ...rightTableCarsWithSold];

  const getPrePopulateSearch = (plan) => {
    const data = plan.data || [];
    const make = data[0];
    const location = data[6];

    if (make && make.toLowerCase() !== 'unknown' && make.toLowerCase() !== 'car') {
      return make;
    }
    if (location && (make === 'car' || make === 'Unknown')) {
      return location;
    }
    return '';
  };

  if (loading) {
    return <div className="loading-error loading">Loading...</div>;
  }

  if (error) {
    return <div className="loading-error error">{error}</div>;
  }

  const stageOptions = ['In Works', 'In Works/Online', 'Online', 'Sold'];

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="car-list-container">
        <HamburgerMenu />
        <h1 className="car-list-title">Northpoint Auto Group Inventory</h1>

        <div className="tabs" style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
          <button
            className={activeTab === 'inventory' ? 'active' : ''}
            onClick={() => setActiveTab('inventory')}
            style={{
              padding: '8px 16px',
              backgroundColor: activeTab === 'inventory' ? '#007bff' : '#e9ecef',
              color: activeTab === 'inventory' ? 'white' : '#495057',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            Inventory
          </button>
          <button
            className={activeTab === 'plans' ? 'active' : ''}
            onClick={() => setActiveTab('plans')}
            style={{
              padding: '8px 16px',
              backgroundColor: activeTab === 'plans' ? '#007bff' : '#e9ecef',
              color: activeTab === 'plans' ? 'white' : '#495057',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            Plans
          </button>
        </div>

        {activeTab === 'inventory' && (
          <>
            <div className="filter-bar">
              <button className="add-car-btn" onClick={() => setShowAddCarModal(true)}>
                Add Car
              </button>
              <button
                className="manual-verification-btn"
                onClick={() => setShowManualVerificationModal(true)}
              >
                Manual Verification {verificationCount > 0 ? `(${verificationCount})` : ''}
              </button>
              <button
                className="hide-photos-btn"
                onClick={togglePhotos}
              >
                {showPhotos ? 'Hide Photos' : 'Show Photos'}
              </button>
              <label className="csv-upload-btn">
                Upload CSV
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleCsvUpload}
                  style={{ display: 'none' }}
                />
              </label>
              <div className="stage-buttons">
                {stageOptions.map((stage) => (
                  <button
                    key={stage}
                    onClick={() => handleStageFilter(stage)}
                    className={selectedStages.includes(stage) ? 'active' : ''}
                  >
                    {stage}
                  </button>
                ))}
              </div>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search..."
              />
            </div>

            {showPopup && (
              <div className="modal-overlay">
                <div className="modal-content">
                  <h2>Upload Summary</h2>
                  {newCars.length > 0 ? (
                    <>
                      <p>File uploaded, {newCars.length} car{newCars.length === 1 ? '' : 's'} added.</p>
                      <ul>
                        {newCars.map((car, index) => (
                          <li key={index}>
                            {car.make} {car.model} (REGO: {car.rego})
                          </li>
                        ))}
                      </ul>
                    </>
                  ) : (
                    <p>File uploaded, no cars added.</p>
                  )}
                  <button onClick={() => setShowPopup(false)} className="close-btn">
                    Close
                  </button>
                </div>
              </div>
            )}

            <AddCarModal
              isOpen={showAddCarModal}
              onClose={() => setShowAddCarModal(false)}
              onAdd={fetchCars}
            />

            {showCarProfileModal && (
              <CarProfileModal
                carId={selectedCarId}
                onClose={() => setShowCarProfileModal(false)}
                fetchCars={fetchCars}
              />
            )}

            {showManualVerificationModal && (
              <ManualVerification
                onClose={() => setShowManualVerificationModal(false)}
                onVerificationComplete={handleVerificationComplete}
              />
            )}

            {editingNextCarId && (
              <NextDestinationsEditor
                carId={editingNextCarId}
                nextDestinations={cars.find(car => car._id === editingNextCarId).next}
                onSave={() => {
                  fetchCars();
                  setEditingNextCarId(null);
                }}
                onCancel={handleCloseNextEditor}
                fetchCars={fetchCars}
              />
            )}

            {editingChecklistCarId && (
              <ChecklistEditor
                carId={editingChecklistCarId}
                checklist={cars.find(car => car._id === editingChecklistCarId).checklist}
                onSave={() => {
                  fetchCars();
                  setEditingChecklistCarId(null);
                }}
                onCancel={handleCloseChecklistEditor}
                fetchCars={fetchCars}
              />
            )}

            {filteredCars.length === 0 ? (
              <p className="no-cars-message">No cars match the selected filters.</p>
            ) : singleTable ? (
              <div style={{ overflowX: 'auto' }}>
                <CarSelectTable
                  onSelectCar={onSelectCar}
                  onClose={() => {}}
                  multiSelect={false}
                  prePopulateSearch={prePopulateSearch}
                />
              </div>
            ) : (
              <>
                <div className="desktop-tables">
                  <div>
                    {leftTableCars.length > 0 ? (
                      <CarTable
                        tableCars={leftTableCars}
                        tableSide="left"
                        isRightTable={false}
                        onSelectCar={onSelectCar}
                        sortConfig={sortConfig}
                        handleSort={handleSort}
                        startEditing={startEditing}
                        editingField={editingField}
                        editValue={editValue}
                        handleEditChange={handleEditChange}
                        saveEdit={saveEdit}
                        cancelEdit={cancelEdit}
                        handleOpenProfile={handleOpenProfile}
                        handleDelete={handleDelete}
                        showPhotos={showPhotos}
                      />
                    ) : (
                      <p className="no-cars-message-table">No cars to display</p>
                    )}
                  </div>
                  <div>
                    {rightTableCarsWithSold.length > 0 ? (
                      <CarTable
                        tableCars={rightTableCarsWithSold}
                        tableSide="right"
                        isRightTable={true}
                        onSelectCar={onSelectCar}
                        sortConfig={sortConfig}
                        handleSort={handleSort}
                        startEditing={startEditing}
                        editingField={editingField}
                        editValue={editValue}
                        handleEditChange={handleEditChange}
                        saveEdit={saveEdit}
                        cancelEdit={cancelEdit}
                        handleOpenProfile={handleOpenProfile}
                        handleDelete={handleDelete}
                        showPhotos={showPhotos}
                      />
                    ) : (
                      <p className="no-cars-message-table">No cars to display</p>
                    )}
                  </div>
                </div>

                <div className="mobile-table">
                  {combinedCarsForMobile.length > 0 ? (
                    <CarTable
                      tableCars={combinedCarsForMobile}
                      tableSide="combined"
                      isRightTable={false}
                      onSelectCar={onSelectCar}
                      sortConfig={sortConfig}
                      handleSort={handleSort}
                      startEditing={startEditing}
                      editingField={editingField}
                      editValue={editValue}
                      handleEditChange={handleEditChange}
                      saveEdit={saveEdit}
                      cancelEdit={cancelEdit}
                      handleOpenProfile={handleOpenProfile}
                      handleDelete={handleDelete}
                      showPhotos={showPhotos}
                    />
                  ) : (
                    <p className="no-cars-message-table">No cars to display</p>
                  )}
                </div>
              </>
            )}
          </>
        )}

        {activeTab === 'plans' && (
          <div className="plans-tab">
            <h2>Plans</h2>
            {Array.isArray(plans) && plans.filter(plan => plan.status === 'pending').length === 0 ? (
              <p>No pending plans.</p>
            ) : (
              <div>
                {Array.isArray(plans) && plans.filter(plan => plan.status === 'pending').map((plan, index) => {
                  const data = plan.data || [];
                  const make = data[0] || '';
                  const model = data[1] || '';
                  const badge = data[2] || '';
                  const description = data[3] || '';
                  const rego = data[4] || '';
                  const oldLocation = data[5] || '';
                  const newLocation = data[6] || '';
                  return (
                    <div key={plan.id} className="plan-item" style={{ borderBottom: '1px solid #dee2e6', padding: '10px 0' }}>
                      {plan.identifiedCar ? (
                        <div>
                          <p>
                            {plan.identifiedCar.make} {plan.identifiedCar.model} {plan.identifiedCar.description} {plan.identifiedCar.rego}, Location = {newLocation}
                          </p>
                          <button
                            onClick={() => handlePlanHappened(plan)}
                            style={{
                              marginRight: '10px',
                              padding: '5px 10px',
                              backgroundColor: '#28a745',
                              color: 'white',
                              border: 'none',
                              borderRadius: '4px',
                              cursor: 'pointer',
                            }}
                          >
                            Happened
                          </button>
                          <button
                            onClick={() => handlePlanDidntHappen(plan)}
                            style={{
                              padding: '5px 10px',
                              backgroundColor: '#dc3545',
                              color: 'white',
                              border: 'none',
                              borderRadius: '4px',
                              cursor: 'pointer',
                            }}
                          >
                            Didn't happen
                          </button>
                        </div>
                      ) : (
                        <div>
                          <p>
                            {make} {model} {description ? description : ''} {rego ? rego : ''}, Location = {newLocation}
                            <button
                              onClick={() => handleAddCarForPlan(plan)}
                              style={{
                                marginLeft: '10px',
                                padding: '5px 10px',
                                backgroundColor: '#007bff',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: 'pointer',
                              }}
                            >
                              add car
                            </button>
                            <button
                              onClick={() => handleSelectCarForPlan(plan)}
                              style={{
                                marginLeft: '10px',
                                padding: '5px 10px',
                                backgroundColor: '#007bff',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: 'pointer',
                              }}
                            >
                              select car
                            </button>
                          </p>
                          <button
                            onClick={() => handlePlanDidntHappen(plan)}
                            style={{
                              padding: '5px 10px',
                              backgroundColor: '#dc3545',
                              color: 'white',
                              border: 'none',
                              borderRadius: '4px',
                              cursor: 'pointer',
                            }}
                          >
                            Didn't happen
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {showAddCarForPlanModal && (
          <div className="modal-overlay">
            <div className="modal-content" style={{ width: '80%', maxWidth: '800px' }}>
              <h2>Add Car for Plan: {planToIdentify.data[0]} {planToIdentify.data[1]}</h2>
              <p>Location: {planToIdentify.data[6]}</p>
              <AddCarModal
                isOpen={true}
                onClose={() => setShowAddCarForPlanModal(false)}
                onAdd={(newCar) => handleAddCarSubmit(newCar)}
                initialValues={{
                  make: planToIdentify.data[0] || '',
                  model: planToIdentify.data[1] || '',
                  badge: planToIdentify.data[2] || '',
                  description: planToIdentify.data[3] || '',
                  rego: planToIdentify.data[4] || '',
                  location: planToIdentify.category === 'Location Update' ? planToIdentify.data[6] || '' : planToIdentify.data[5] || '',
                  status: planToIdentify.category === 'Ready' ? planToIdentify.data[6] || '' : '',
                  checklist: planToIdentify.category === 'Car Repairs' ? [planToIdentify.data[5] || ''] : [],
                  next: planToIdentify.category === 'Drop Off' ? [{ location: planToIdentify.data[6] || '', created: new Date() }] : [],
                  notes: planToIdentify.data[planToIdentify.data.length - 1] || ''
                }}
              />
            </div>
          </div>
        )}

        {showSelectCarModal && (
          <div className="modal-overlay">
            <div className="modal-content" style={{ width: '80%', maxWidth: '800px' }}>
              <h2>Select Car for Plan: {planToIdentify.data[0]} {planToIdentify.data[1]}</h2>
              <p>Location: {planToIdentify.data[6]}</p>
              <CarList
                onSelectCar={handleSelectCar}
                singleTable={true}
                prePopulateSearch={getPrePopulateSearch(planToIdentify)}
              />
              <button
                onClick={() => setShowSelectCarModal(false)}
                className="close-btn"
                style={{ marginTop: '10px' }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </DndProvider>
  );
};

export default CarList;