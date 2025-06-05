import React, { useState, useEffect } from 'react';
import axios from '../../utils/axiosConfig';
import { useNavigate } from 'react-router-dom';

const HamburgerMenu = () => {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();

  const toggleMenu = () => {
    setIsOpen((prev) => !prev);
  };

  const handleNavigation = (path) => {
    navigate(path);
    setIsOpen(false);
  };

  // Handle logout
  const handleLogout = async () => {
    try {
      await axios.post('http://localhost:5000/api/auth/logout');
    } catch (err) {
      console.error('Error logging out:', err);
    }
    navigate('/login');
    setIsOpen(false);
  };

  // Handle clicks outside the menu to close it
  const handleOutsideClick = (e) => {
    if (isOpen) {
      const menuElement = document.querySelector('.hamburger-menu');
      if (menuElement && !menuElement.contains(e.target) && e.target !== document.querySelector('.hamburger-button')) {
        setIsOpen(false);
      }
    }
  };

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('click', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('click', handleOutsideClick);
    };
  }, [isOpen]);

  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={toggleMenu}
        className="hamburger-button"
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          fontSize: '24px',
          color: '#343a40',
          padding: '10px',
          position: 'absolute',
          top: '10px',
          right: '10px',
          zIndex: 1100,
        }}
        aria-label="Toggle navigation menu"
      >
        {isOpen ? '✖' : '☰'}
      </button>

      {isOpen && (
        <div
          className="hamburger-menu"
          style={{
            position: 'absolute',
            top: '50px',
            right: '10px',
            backgroundColor: '#fff',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
            zIndex: 1100,
            width: '200px',
          }}
        >
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            <li>
              <button
                onClick={() => handleNavigation('/dashboard')}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  background: 'none',
                  border: 'none',
                  textAlign: 'left',
                  fontSize: '14px',
                  color: '#343a40',
                  cursor: 'pointer',
                  borderBottom: '1px solid #dee2e6',
                }}
                onMouseEnter={(e) => (e.target.style.backgroundColor = '#f5f5f5')}
                onMouseLeave={(e) => (e.target.style.backgroundColor = 'transparent')}
              >
                Dashboard
              </button>
            </li>
            <li>
              <button
                onClick={() => handleNavigation('/cars')}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  background: 'none',
                  border: 'none',
                  textAlign: 'left',
                  fontSize: '14px',
                  color: '#343a40',
                  cursor: 'pointer',
                  borderBottom: '1px solid #dee2e6',
                }}
                onMouseEnter={(e) => (e.target.style.backgroundColor = '#f5f5f5')}
                onMouseLeave={(e) => (e.target.style.backgroundColor = 'transparent')}
              >
                Inventory
              </button>
            </li>
            <li>
              <button
                onClick={() => handleNavigation('/customer-appointments')}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  background: 'none',
                  border: 'none',
                  textAlign: 'left',
                  fontSize: '14px',
                  color: '#343a40',
                  cursor: 'pointer',
                  borderBottom: '1px solid #dee2e6',
                }}
                onMouseEnter={(e) => (e.target.style.backgroundColor = '#f5f5f5')}
                onMouseLeave={(e) => (e.target.style.backgroundColor = 'transparent')}
              >
                Customer Appointments
              </button>
            </li>
            <li>
              <button
                onClick={() => handleNavigation('/recon-appointments')}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  background: 'none',
                  border: 'none',
                  textAlign: 'left',
                  fontSize: '14px',
                  color: '#343a40',
                  cursor: 'pointer',
                  borderBottom: '1px solid #dee2e6',
                }}
                onMouseEnter={(e) => (e.target.style.backgroundColor = '#f5f5f5')}
                onMouseLeave={(e) => (e.target.style.backgroundColor = 'transparent')}
              >
                Reconditioner Appointments
              </button>
            </li>
            <li>
              <button
                onClick={() => handleNavigation('/tasks')}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  background: 'none',
                  border: 'none',
                  textAlign: 'left',
                  fontSize: '14px',
                  color: '#343a40',
                  cursor: 'pointer',
                  borderBottom: '1px solid #dee2e6',
                }}
                onMouseEnter={(e) => (e.target.style.backgroundColor = '#f5f5f5')}
                onMouseLeave={(e) => (e.target.style.backgroundColor = 'transparent')}
              >
                Tasks
              </button>
            </li>
            <li>
              <button
                onClick={() => handleNavigation('/notes')}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  background: 'none',
                  border: 'none',
                  textAlign: 'left',
                  fontSize: '14px',
                  color: '#343a40',
                  cursor: 'pointer',
                  borderBottom: '1px solid #dee2e6',
                }}
                onMouseEnter={(e) => (e.target.style.backgroundColor = '#f5f5f5')}
                onMouseLeave={(e) => (e.target.style.backgroundColor = 'transparent')}
              >
                Notes
              </button>
            </li>
            <li>
              <button
                onClick={() => handleNavigation('/car-archive')}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  background: 'none',
                  border: 'none',
                  textAlign: 'left',
                  fontSize: '14px',
                  color: '#343a40',
                  cursor: 'pointer',
                  borderBottom: '1px solid #dee2e6',
                }}
                onMouseEnter={(e) => (e.target.style.backgroundColor = '#f5f5f5')}
                onMouseLeave={(e) => (e.target.style.backgroundColor = 'transparent')}
              >
                Car Archive
              </button>
            </li>
            <li>
              <button
                onClick={handleLogout}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  background: 'none',
                  border: 'none',
                  textAlign: 'left',
                  fontSize: '14px',
                  color: '#dc3545',
                  cursor: 'pointer',
                }}
                onMouseEnter={(e) => (e.target.style.backgroundColor = '#f5f5f5')}
                onMouseLeave={(e) => (e.target.style.backgroundColor = 'transparent')}
              >
                Logout
              </button>
            </li>
          </ul>
        </div>
      )}
    </div>
  );
};

export default HamburgerMenu;