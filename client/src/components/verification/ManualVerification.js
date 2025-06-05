import React, { useState, useEffect, useCallback } from 'react';
import axios from '../../utils/axiosConfig';
import AddCarModal from '../car/AddCarModal';
import CarList from '../car/CarList';

const ManualVerification = ({ onClose, onVerificationComplete }) => {
  const [verifications, setVerifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedVerification, setSelectedVerification] = useState(null);
  const [showCarSelection, setShowCarSelection] = useState(false);
  const [showAddCar, setShowAddCar] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [confirmationDetails, setConfirmationDetails] = useState(null);
  const [lastAction, setLastAction] = useState(null);

  useEffect(() => {
    const fetchVerifications = async () => {
      try {
        const response = await axios.get('http://localhost:5000/api/manualverifications');
        setVerifications(response.data);
        setLoading(false);
      } catch (err) {
        setError('Failed to fetch manual verifications');
        setLoading(false);
      }
    };
    fetchVerifications();
  }, []);

  const handleSelectVerification = (verification) => {
    setSelectedVerification(verification);
    setShowCarSelection(true);
  };

  const handleDeleteVerification = async (id) => {
    try {
      await axios.delete(`http://localhost:5000/api/manualverifications/${id}`);
      const response = await axios.get('http://localhost:5000/api/manualverifications');
      setVerifications(response.data);
    } catch (err) {
      console.error('Error deleting verification:', err);
      alert('Failed to delete verification');
    }
  };

  const handleAddCar = (verification) => {
    setSelectedVerification(verification);
    setShowAddCar(true);
  };

  const handleSelectCar = async (carId) => {
    if (!selectedVerification) return;
    try {
      const { category, data } = selectedVerification;
      let updateData = {};
      let changeSummary = [];

      switch (category) {
        case 'Ready':
          updateData = {
            location: data[5] || undefined,
            status: data[6] || undefined,
            description: data[3] || undefined,
            notes: data[7] ? `${data[7]}` : undefined,
          };
          if (data[5]) changeSummary.push(`Location = ${data[5]}`);
          if (data[6]) changeSummary.push(`Status = ${data[6]}`);
          if (data[3]) changeSummary.push(`Description = ${data[3]}`);
          if (data[7]) changeSummary.push(`Notes = ${data[7]}`);
          break;
        case 'Drop Off':
          updateData = {
            location: data[5] || undefined,
            next: data[6] || undefined,
            description: data[3] || undefined,
            notes: data[7] ? `${data[7]}` : undefined,
          };
          if (data[5]) changeSummary.push(`Location = ${data[5]}`);
          if (data[6]) changeSummary.push(`Next = ${data[6]}`);
          if (data[3]) changeSummary.push(`Description = ${data[3]}`);
          if (data[7]) changeSummary.push(`Notes = ${data[7]}`);
          break;
        case 'Car Repairs':
          updateData = {
            checklist: data[5] ? [data[5]] : [],
            description: data[3] || undefined,
            notes: data[6] ? `${data[6]}` : undefined,
          };
          if (data[5]) changeSummary.push(`Checklist = ${data[5]}`);
          if (data[3]) changeSummary.push(`Description = ${data[3]}`);
          if (data[6]) changeSummary.push(`Notes = ${data[6]}`);
          break;
        case 'Location Update':
          updateData = {
            location: data[6] || undefined,
            description: data[3] || undefined,
            notes: data[7] ? `${data[7]}` : undefined,
          };
          if (data[6]) changeSummary.push(`Location = ${data[6]}`);
          if (data[3]) changeSummary.push(`Description = ${data[3]}`);
          if (data[7]) changeSummary.push(`Notes = ${data[7]}`);
          break;
        default:
          return;
      }

      // Remove undefined fields
      Object.keys(updateData).forEach(key => updateData[key] === undefined && delete updateData[key]);

      // Store original car data for undo
      const carBeforeUpdate = await axios.get(`http://localhost:5000/api/cars/${carId}`);
      const originalData = carBeforeUpdate.data;

      // Update the car
      await axios.put(`http://localhost:5000/api/cars/${carId}`, updateData);

      // Show confirmation popup
      setConfirmationDetails({
        car: { make: data[0], model: data[1], rego: data[4] },
        changes: changeSummary,
        verificationId: selectedVerification._id,
        carId,
        updateData,
        originalData
      });
      setLastAction({ type: 'update', carId, updateData });
      setShowConfirmation(true);
      setShowCarSelection(false);
      setSelectedVerification(null);
    } catch (err) {
      console.error('Error applying verification:', err);
      alert('Failed to apply verification');
    }
  };

  const handleCarAdded = async () => {
    try {
      const { data, category } = selectedVerification;
      const changeSummary = [];
      if (category === 'Ready') {
        if (data[5]) changeSummary.push(`Location = ${data[5]}`);
        if (data[6]) changeSummary.push(`Status = ${data[6]}`);
        if (data[3]) changeSummary.push(`Description = ${data[3]}`);
        if (data[7]) changeSummary.push(`Notes = ${data[7]}`);
      } else if (category === 'Drop Off') {
        if (data[5]) changeSummary.push(`Location = ${data[5]}`);
        if (data[6]) changeSummary.push(`Next = ${data[6]}`);
        if (data[3]) changeSummary.push(`Description = ${data[3]}`);
        if (data[7]) changeSummary.push(`Notes = ${data[7]}`);
      } else if (category === 'Car Repairs') {
        if (data[5]) changeSummary.push(`Checklist = ${data[5]}`);
        if (data[3]) changeSummary.push(`Description = ${data[3]}`);
        if (data[6]) changeSummary.push(`Notes = ${data[6]}`);
      } else if (category === 'Location Update') {
        if (data[6]) changeSummary.push(`Location = ${data[6]}`);
        if (data[3]) changeSummary.push(`Description = ${data[3]}`);
        if (data[7]) changeSummary.push(`Notes = ${data[7]}`);
      }

      // Show confirmation popup
      setConfirmationDetails({
        car: { make: data[0], model: data[1], rego: data[4] },
        changes: changeSummary,
        verificationId: selectedVerification._id,
        action: 'add'
      });
      setLastAction({ type: 'add', verificationId: selectedVerification._id });
      setShowAddCar(false);
      setSelectedVerification(null);
    } catch (err) {
      console.error('Error after adding car:', err);
      alert('Failed to complete verification');
    }
  };

  const handleConfirm = async () => {
    try {
      if (lastAction.type === 'update' || lastAction.type === 'add') {
        await axios.delete(`http://localhost:5000/api/manualverifications/${confirmationDetails.verificationId}`);
        const response = await axios.get('http://localhost:5000/api/manualverifications');
        setVerifications(response.data);
        onVerificationComplete();
      }
      setShowConfirmation(false);
      setConfirmationDetails(null);
      setLastAction(null);
    } catch (err) {
      console.error('Error confirming action:', err);
      alert('Failed to confirm action');
    }
  };

  const handleUndo = async () => {
    try {
      if (lastAction.type === 'update') {
        // Revert car changes
        await axios.put(`http://localhost:5000/api/cars/${lastAction.carId}`, lastAction.originalData);
      } else if (lastAction.type === 'add') {
        // Delete the newly added car (assumes AddCarForm returns the new car ID)
        const newCar = await axios.get('http://localhost:5000/api/cars').then(res => 
          res.data.find(car => car.rego === confirmationDetails.car.rego || 
            (car.make === confirmationDetails.car.make && car.model === confirmationDetails.car.model))
        );
        if (newCar) {
          await axios.delete(`http://localhost:5000/api/cars/${newCar._id}`);
        }
      }
      // Restore the verification entry
      const manualEntry = new ManualVerification({
        message: selectedVerification?.message || confirmationDetails.car.make,
        category: selectedVerification?.category || 'Unknown',
        data: selectedVerification?.data || []
      });
      await manualEntry.save();
      const response = await axios.get('http://localhost:5000/api/manualverifications');
      setVerifications(response.data);
      onVerificationComplete();
      setShowConfirmation(false);
      setConfirmationDetails(null);
      setLastAction(null);
    } catch (err) {
      console.error('Error undoing action:', err);
      alert('Failed to undo action');
    }
  };

  const renderVerificationDetails = (verification) => {
    const { category, data } = verification;
    switch (category) {
      case 'Ready':
        return (
          <div>
            <p><strong>Make:</strong> {data[0] || 'N/A'}</p>
            <p><strong>Model:</strong> {data[1] || 'N/A'}</p>
            <p><strong>Badge:</strong> {data[2] || 'N/A'}</p>
            <p><strong>Description:</strong> {data[3] || 'N/A'}</p>
            <p><strong>Rego:</strong> {data[4] || 'N/A'}</p>
            <p><strong>Location:</strong> {data[5] || 'N/A'}</p>
            <p><strong>Status:</strong> {data[6] || 'N/A'}</p>
            <p><strong>Notes:</strong> {data[7] || 'N/A'}</p>
          </div>
        );
      case 'Drop Off':
        return (
          <div>
            <p><strong>Make:</strong> {data[0] || 'N/A'}</p>
            <p><strong>Model:</strong> {data[1] || 'N/A'}</p>
            <p><strong>Badge:</strong> {data[2] || 'N/A'}</p>
            <p><strong>Description:</strong> {data[3] || 'N/A'}</p>
            <p><strong>Rego:</strong> {data[4] || 'N/A'}</p>
            <p><strong>Current Location:</strong> {data[5] || 'N/A'}</p>
            <p><strong>Next Location:</strong> {data[6] || 'N/A'}</p>
            <p><strong>Notes:</strong> {data[7] || 'N/A'}</p>
          </div>
        );
      case 'Car Repairs':
        return (
          <div>
            <p><strong>Make:</strong> {data[0] || 'N/A'}</p>
            <p><strong>Model:</strong> {data[1] || 'N/A'}</p>
            <p><strong>Badge:</strong> {data[2] || 'N/A'}</p>
            <p><strong>Description:</strong> {data[3] || 'N/A'}</p>
            <p><strong>Rego:</strong> {data[4] || 'N/A'}</p>
            <p><strong>Repair Task:</strong> {data[5] || 'N/A'}</p>
            <p><strong>Notes:</strong> {data[6] || 'N/A'}</p>
          </div>
        );
      case 'Location Update':
        return (
          <div>
            <p><strong>Make:</strong> {data[0] || 'N/A'}</p>
            <p><strong>Model:</strong> {data[1] || 'N/A'}</p>
            <p><strong>Badge:</strong> {data[2] || 'N/A'}</p>
            <p><strong>Description:</strong> {data[3] || 'N/A'}</p>
            <p><strong>Rego:</strong> {data[4] || 'N/A'}</p>
            <p><strong>Old Location:</strong> {data[5] || 'N/A'}</p>
            <p><strong>New Location:</strong> {data[6] || 'N/A'}</p>
            <p><strong>Notes:</strong> {data[7] || 'N/A'}</p>
          </div>
        );
      default:
        return <p>Unknown category</p>;
    }
  };

  const renderChangesSummary = (verification) => {
    const { category, data } = verification;
    const carInfo = `${data[0] || 'Unknown'} ${data[1] || ''} ${data[4] || ''}`.trim();
    const changes = [];

    switch (category) {
      case 'Ready':
        if (data[5]) changes.push(`Location = ${data[5]}`);
        if (data[6]) changes.push(`Status = ${data[6]}`);
        if (data[3]) changes.push(`Description = ${data[3]}`);
        if (data[7]) changes.push(`Notes = ${data[7]}`);
        break;
      case 'Drop Off':
        if (data[5]) changes.push(`Location = ${data[5]}`);
        if (data[6]) changes.push(`Next = ${data[6]}`);
        if (data[3]) changes.push(`Description = ${data[3]}`);
        if (data[7]) changes.push(`Notes = ${data[7]}`);
        break;
      case 'Car Repairs':
        if (data[5]) changes.push(`Checklist = ${data[5]}`);
        if (data[3]) changes.push(`Description = ${data[3]}`);
        if (data[6]) changes.push(`Notes = ${data[6]}`);
        break;
      case 'Location Update':
        if (data[6]) changes.push(`Location = ${data[6]}`);
        if (data[3]) changes.push(`Description = ${data[3]}`);
        if (data[7]) changes.push(`Notes = ${data[7]}`);
        break;
      default:
        return 'N/A';
    }

    return changes.length > 0 ? `Car: ${carInfo}, Change: ${changes.join(', ')}` : 'No changes specified';
  };

  // Determine the pre-populated search term based on the verification entry
  const getPrePopulateSearch = (verification) => {
    const { data, category } = verification;
    const make = data[0]; // Make is typically in data[0]
    const location = category === 'Location Update' ? data[6] : data[5]; // New location for Location Update, otherwise current location

    // If make is mentioned (not "Unknown" or "car"), use the make
    if (make && make.toLowerCase() !== 'unknown' && make.toLowerCase() !== 'car') {
      return make;
    }
    // If no make is mentioned (or make is "car") and a location is specified, use the location
    if (location && (make === 'car' || make === 'Unknown')) {
      return location;
    }
    return '';
  };

  if (loading) return <div style={{ padding: '20px', textAlign: 'center' }}>Loading...</div>;
  if (error) return <div style={{ padding: '20px', textAlign: 'center', color: '#dc3545' }}>{error}</div>;

  return (
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
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: '#fff',
          padding: '24px',
          borderRadius: '12px',
          width: '800px',
          maxHeight: '90vh',
          overflowY: 'auto',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#343a40', marginBottom: '20px', textAlign: 'center' }}>
          Manual Verification
        </h2>

        {!selectedVerification && !showConfirmation && (
          <div>
            {verifications.length === 0 ? (
              <p style={{ fontSize: '16px', color: '#6c757d', textAlign: 'center' }}>
                No manual verifications pending.
              </p>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                <thead>
                  <tr style={{ backgroundColor: '#e8ecef' }}>
                    <th style={{ border: '1px solid #dee2e6', padding: '8px', textAlign: 'left' }}>Message</th>
                    <th style={{ border: '1px solid #dee2e6', padding: '8px', textAlign: 'left' }}>Changes</th>
                    <th style={{ border: '1px solid #dee2e6', padding: '8px', textAlign: 'left' }}>Created</th>
                    <th style={{ border: '1px solid #dee2e6', padding: '8px', textAlign: 'left' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {verifications.map((verification) => (
                    <tr key={verification._id}>
                      <td style={{ border: '1px solid #dee2e6', padding: '8px' }}>{verification.message}</td>
                      <td style={{ border: '1px solid #dee2e6', padding: '8px' }}>{renderChangesSummary(verification)}</td>
                      <td style={{ border: '1px solid #dee2e6', padding: '8px' }}>
                        {new Date(verification.created).toLocaleString()}
                      </td>
                      <td style={{ border: '1px solid #dee2e6', padding: '8px' }}>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button
                            onClick={() => handleDeleteVerification(verification._id)}
                            style={{
                              padding: '6px 12px',
                              backgroundColor: '#dc3545',
                              color: 'white',
                              border: 'none',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              fontSize: '14px',
                            }}
                          >
                            Delete
                          </button>
                          <button
                            onClick={() => handleAddCar(verification)}
                            style={{
                              padding: '6px 12px',
                              backgroundColor: '#28a745',
                              color: 'white',
                              border: 'none',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              fontSize: '14px',
                            }}
                          >
                            Add Car
                          </button>
                          <button
                            onClick={() => handleSelectVerification(verification)}
                            style={{
                              padding: '6px 12px',
                              backgroundColor: '#007bff',
                              color: 'white',
                              border: 'none',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              fontSize: '14px',
                            }}
                          >
                            Select Car
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px' }}>
              <button
                onClick={onClose}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#6c757d',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '14px',
                }}
              >
                Close
              </button>
            </div>
          </div>
        )}

        {selectedVerification && showCarSelection && (
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#343a40', marginBottom: '10px' }}>
              Verification Details
            </h3>
            {renderVerificationDetails(selectedVerification)}
            <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#343a40', margin: '20px 0 10px' }}>
              Select a Car
            </h3>
            <CarList
              onSelectCar={handleSelectCar}
              singleTable={true}
              prePopulateSearch={getPrePopulateSearch(selectedVerification)}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '20px' }}>
              <button
                onClick={() => setShowAddCar(true)}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#28a745',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '14px',
                }}
              >
                Add Car
              </button>
              <div>
                <button
                  onClick={() => setShowCarSelection(false)}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: '#6c757d',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    marginRight: '10px',
                  }}
                >
                  Back
                </button>
                <button
                  onClick={onClose}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: '#dc3545',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '14px',
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {selectedVerification && showAddCar && (
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#343a40', marginBottom: '10px' }}>
              Add New Car
            </h3>
            <AddCarModal
              isOpen={true}
              onClose={() => {
                setShowAddCar(false);
                setSelectedVerification(null);
              }}
              onAdd={handleCarAdded}
              initialValues={{
                make: selectedVerification.data[0] || '',
                model: selectedVerification.data[1] || '',
                badge: selectedVerification.data[2] || '',
                description: selectedVerification.data[3] || '',
                rego: selectedVerification.data[4] || '',
                location: selectedVerification.category === 'Location Update' ? selectedVerification.data[6] || '' : selectedVerification.data[5] || '',
                status: selectedVerification.category === 'Ready' ? selectedVerification.data[6] || '' : '',
                checklist: selectedVerification.category === 'Car Repairs' ? [selectedVerification.data[5] || ''] : [],
                next: selectedVerification.category === 'Drop Off' ? selectedVerification.data[6] || '' : '',
                notes: selectedVerification.data[selectedVerification.data.length - 1] || ''
              }}
            />
          </div>
        )}

        {showConfirmation && (
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
              zIndex: 1100,
            }}
            onClick={() => setShowConfirmation(false)}
          >
            <div
              style={{
                backgroundColor: '#fff',
                padding: '24px',
                borderRadius: '12px',
                width: '500px',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#343a40', marginBottom: '15px', textAlign: 'center' }}>
                Confirm Changes
              </h3>
              <p style={{ fontSize: '14px', color: '#495057' }}>
                <strong>Car:</strong> {confirmationDetails.car.make} {confirmationDetails.car.model} {confirmationDetails.car.rego || ''}
              </p>
              <p style={{ fontSize: '14px', color: '#495057', marginBottom: '15px' }}>
                <strong>Changes:</strong> {confirmationDetails.changes.join(', ') || 'None'}
              </p>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <button
                  onClick={handleUndo}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: '#dc3545',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '14px',
                  }}
                >
                  Undo
                </button>
                <button
                  onClick={handleConfirm}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: '#28a745',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '14px',
                  }}
                >
                  Confirm
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ManualVerification;