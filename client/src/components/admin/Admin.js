import React, { useState, useEffect } from 'react';
import axios from '../../utils/axiosConfig'; // Updated path
import HamburgerMenu from '../shared/HamburgerMenu'; // Updated path
import { useNavigate } from 'react-router-dom';

const Admin = () => {
  const [pendingUsers, setPendingUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchPendingUsers = async () => {
      try {
        const response = await axios.get('http://localhost:5000/api/auth/users/pending');
        setPendingUsers(response.data);
        setLoading(false);
      } catch (err) {
        if (err.response?.status === 401 || err.response?.status === 403) {
          navigate('/login');
        } else {
          setError('Failed to fetch pending users: ' + err.message);
          setLoading(false);
        }
      }
    };
    fetchPendingUsers();
  }, [navigate]);

  const handleApprove = async (userId) => {
    try {
      await axios.post(`http://localhost:5000/api/auth/approve/${userId}`);
      setPendingUsers(pendingUsers.filter(user => user._id !== userId));
    } catch (err) {
      if (err.response?.status === 401 || err.response?.status === 403) {
        navigate('/login');
      } else {
        setError('Failed to approve user: ' + err.message);
      }
    }
  };

  const handleReject = async (userId) => {
    try {
      await axios.post(`http://localhost:5000/api/auth/reject/${userId}`);
      setPendingUsers(pendingUsers.filter(user => user._id !== userId));
    } catch (err) {
      if (err.response?.status === 401 || err.response?.status === 403) {
        navigate('/login');
      } else {
        setError('Failed to reject user: ' + err.message);
      }
    }
  };

  if (loading) return <div style={{ textAlign: 'center', padding: '20px' }}>Loading...</div>;
  if (error) return <div style={{ textAlign: 'center', padding: '20px', color: 'red' }}>{error}</div>;

  return (
    <div style={{ padding: '20px', fontFamily: "'Roboto', sans-serif", backgroundColor: '#fff', minHeight: '100vh' }}>
      <HamburgerMenu />
      <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#343a40', textAlign: 'center', marginBottom: '20px' }}>
        Admin - Pending Users
      </h1>
      {pendingUsers.length === 0 ? (
        <p style={{ textAlign: 'center' }}>No pending users.</p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', backgroundColor: '#fff', borderRadius: '8px', overflow: 'hidden' }}>
          <thead>
            <tr style={{ backgroundColor: '#e8ecef' }}>
              <th style={{ padding: '12px', border: '1px solid #dee2e6', textAlign: 'left' }}>Name</th>
              <th style={{ padding: '12px', border: '1px solid #dee2e6', textAlign: 'left' }}>Email</th>
              <th style={{ padding: '12px', border: '1px solid #dee2e6', textAlign: 'left' }}>Verified</th>
              <th style={{ padding: '12px', border: '1px solid #dee2e6', textAlign: 'left' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {pendingUsers.map(user => (
              <tr key={user._id}>
                <td style={{ padding: '12px', border: '1px solid #dee2e6' }}>{user.name}</td>
                <td style={{ padding: '12px', border: '1px solid #dee2e6' }}>{user.email}</td>
                <td style={{ padding: '12px', border: '1px solid #dee2e6' }}>{user.isVerified ? 'Yes' : 'No'}</td>
                <td style={{ padding: '12px', border: '1px solid #dee2e6', display: 'flex', gap: '10px' }}>
                  <button
                    onClick={() => handleApprove(user._id)}
                    style={{
                      padding: '6px 12px',
                      backgroundColor: '#28a745',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                    }}
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => handleReject(user._id)}
                    style={{
                      padding: '6px 12px',
                      backgroundColor: '#dc3545',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                    }}
                  >
                    Reject
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default Admin;