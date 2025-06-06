import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from '../../utils/axiosConfig';
import HamburgerMenu from '../shared/HamburgerMenu';

const CarArchive = () => {
  const [archivedCars, setArchivedCars] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchArchivedCars = async () => {
      try {
        const response = await axios.get('/api/cars/archived');
        console.log('Fetched archived cars:', response.data);
        setArchivedCars(response.data);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching archived cars:', err);
        if (err.response?.status === 401 || err.response?.status === 403) {
          navigate('/login');
        } else {
          setError('Failed to fetch archived cars: ' + err.message);
          setLoading(false);
        }
      }
    };

    fetchArchivedCars();
    const interval = setInterval(fetchArchivedCars, 10000);
    return () => clearInterval(interval);
  }, [navigate]);

  const handleRestore = async (id) => {
    if (!window.confirm('Are you sure you want to restore this car?')) return;
    try {
      const response = await axios.post(`/api/cars/${id}/restore`);
      console.log('Restore response:', response.data);
      setArchivedCars(archivedCars.filter(car => car._id !== id));
    } catch (err) {
      console.error('Error restoring car:', err);
      if (err.response?.status === 401 || err.response?.status === 403) {
        navigate('/login');
      } else {
        alert('Failed to restore car: ' + err.message);
      }
    }
  };

  const handlePermanentDelete = async (id) => {
    if (!window.confirm('Are you sure you want to permanently delete this car? This action cannot be undone.')) return;
    if (!window.confirm('Please confirm again: this will permanently delete the car and cannot be recovered.')) return;
    try {
      const response = await axios.delete(`/api/cars/${id}/permanent`);
      console.log('Permanent delete response:', response.data);
      setArchivedCars(archivedCars.filter(car => car._id !== id));
    } catch (err) {
      console.error('Error permanently deleting car:', err);
      if (err.response?.status === 401 || err.response?.status === 403) {
        navigate('/login');
      } else {
        alert('Failed to permanently delete car: ' + err.message);
      }
    }
  };

  if (loading) return <div style={{ textAlign: 'center', padding: '20px' }}>Loading...</div>;
  if (error) return <div style={{ textAlign: 'center', padding: '20px', color: '#dc3545' }}>{error}</div>;

  return (
    <div style={{ padding: '20px', fontFamily: "'Roboto', sans-serif", backgroundColor: '#fff', minHeight: '100vh' }}>
      <HamburgerMenu />
      <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#343a40', textAlign: 'center', marginBottom: '20px' }}>
        Car Archive
      </h1>
      {archivedCars.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '20px', color: '#6c757d' }}>
          No archived cars found.
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', backgroundColor: '#fff', borderRadius: '8px', overflow: 'hidden' }}>
            <thead>
              <tr style={{ backgroundColor: '#e8ecef', height: '30px' }}>
                <th style={{ padding: '6px', border: '1px solid #dee2e6', textAlign: 'left' }}>Make</th>
                <th style={{ padding: '6px', border: '1px solid #dee2e6', textAlign: 'left' }}>Model</th>
                <th style={{ padding: '6px', border: '1px solid #dee2e6', textAlign: 'left' }}>Badge</th>
                <th style={{ padding: '6px', border: '1px solid #dee2e6', textAlign: 'left' }}>Rego</th>
                <th style={{ padding: '6px', border: '1px solid #dee2e6', textAlign: 'left' }}>Archived At</th>
                <th style={{ padding: '6px', border: '1px solid #dee2e6', textAlign: 'left' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {archivedCars.map(car => (
                <tr key={car._id} style={{ height: '50px' }}>
                  <td style={{ padding: '6px', border: '1px solid #dee2e6', verticalAlign: 'middle' }}>
                    {car.make || '-'}
                  </td>
                  <td style={{ padding: '6px', border: '1px solid #dee2e6', verticalAlign: 'middle' }}>
                    {car.model || '-'}
                  </td>
                  <td style={{ padding: '6px', border: '1px solid #dee2e6', verticalAlign: 'middle' }}>
                    {car.badge || '-'}
                  </td>
                  <td style={{ padding: '6px', border: '1px solid #dee2e6', verticalAlign: 'middle' }}>
                    {car.rego || '-'}
                  </td>
                  <td style={{ padding: '6px', border: '1px solid #dee2e6', verticalAlign: 'middle' }}>
                    {car.archivedAt ? new Date(car.archivedAt).toLocaleString() : '-'}
                  </td>
                  <td style={{ padding: '6px', border: '1px solid #dee2e6', verticalAlign: 'middle', textAlign: 'center' }}>
                    <button
                      onClick={() => handleRestore(car._id)}
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        fontSize: '14px',
                        color: '#28a745',
                        marginRight: '10px',
                        transition: 'color 0.2s',
                      }}
                      onMouseEnter={(e) => (e.target.style.color = '#218838')}
                      onMouseLeave={(e) => (e.target.style.color = '#28a745')}
                    >
                      Restore
                    </button>
                    <button
                      onClick={() => handlePermanentDelete(car._id)}
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
                      Delete Permanently
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default CarArchive;