import React from 'react';
import { Link } from 'react-router-dom';
import HamburgerMenu from '../shared/HamburgerMenu';
import ReadyCars from './ReadyCars';
import CustomerAndReconAppointments from './CustomerAndReconAppointments';

const Dashboard = () => {
  return (
    <div style={{ padding: '20px', fontFamily: "'Roboto', sans-serif", backgroundColor: '#fff', minHeight: '100vh' }}>
      <HamburgerMenu />
      <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#343a40', textAlign: 'center', marginBottom: '20px' }}>
        Dashboard
      </h1>
      <div style={{ display: 'flex', flexWrap: 'nowrap', gap: '10px', justifyContent: 'center', overflowX: 'auto', marginBottom: '30px' }}>
        <Link
          to="/admin"
          style={{
            padding: '8px 15px',
            backgroundColor: '#007bff',
            color: 'white',
            textDecoration: 'none',
            borderRadius: '4px',
            fontSize: '14px',
            textAlign: 'center',
            minWidth: '150px',
            flexShrink: 0,
          }}
        >
          Admin - Manage Users
        </Link>
        <Link
          to="/cars"
          style={{
            padding: '8px 15px',
            backgroundColor: '#007bff',
            color: 'white',
            textDecoration: 'none',
            borderRadius: '4px',
            fontSize: '14px',
            textAlign: 'center',
            minWidth: '150px',
            flexShrink: 0,
          }}
        >
          Inventory
        </Link>
        <Link
          to="/customer-appointments"
          style={{
            padding: '8px 15px',
            backgroundColor: '#007bff',
            color: 'white',
            textDecoration: 'none',
            borderRadius: '4px',
            fontSize: '14px',
            textAlign: 'center',
            minWidth: '150px',
            flexShrink: 0,
          }}
        >
          Customer Appointments
        </Link>
        <Link
          to="/recon-appointments"
          style={{
            padding: '8px 15px',
            backgroundColor: '#007bff',
            color: 'white',
            textDecoration: 'none',
            borderRadius: '4px',
            fontSize: '14px',
            textAlign: 'center',
            minWidth: '150px',
            flexShrink: 0,
          }}
        >
          Reconditioner Appointments
        </Link>
        <Link
          to="/tasks"
          style={{
            padding: '8px 15px',
            backgroundColor: '#007bff',
            color: 'white',
            textDecoration: 'none',
            borderRadius: '4px',
            fontSize: '14px',
            textAlign: 'center',
            minWidth: '150px',
            flexShrink: 0,
          }}
        >
          Tasks
        </Link>
        <Link
          to="/notes"
          style={{
            padding: '8px 15px',
            backgroundColor: '#007bff',
            color: 'white',
            textDecoration: 'none',
            borderRadius: '4px',
            fontSize: '14px',
            textAlign: 'center',
            minWidth: '150px',
            flexShrink: 0,
          }}
        >
          Notes
        </Link>
      </div>

      {/* Render the ReadyCars Component */}
      <ReadyCars />

      {/* Render the CustomerAndReconAppointments Component */}
      <CustomerAndReconAppointments />
    </div>
  );
};

export default Dashboard;