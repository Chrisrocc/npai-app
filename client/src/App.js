import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import CarList from './components/car/CarList';
import CustomerAppointments from './components/appointments/CustomerAppointments';
import ReconAppointments from './components/appointments/ReconAppointments';
import Tasks from './components/tasks/Tasks';
import ManualVerification from './components/verification/ManualVerification';
import Login from './components/auth/Login';
import Signup from './components/auth/Signup';
import Dashboard from './components/dashboard/Dashboard';
import Notes from './components/notes/Notes';
import Admin from './components/admin/Admin';
import CarProfileModal from './components/car/CarProfileModal';
import CarArchive from './components/car/CarArchive';

const ProtectedRoute = ({ children }) => {
  const location = useLocation();
  const isAuthenticated = localStorage.getItem('token'); // Check if token exists
  return isAuthenticated ? children : <Navigate to="/login" state={{ from: location }} />;
};

function App() {
  return (
    <Router>
      <Routes>
        {/* Public Routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/verify/:token" element={<Login />} />
        <Route path="/reset-password/:token" element={<Login />} />

        {/* Protected Routes */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin"
          element={
            <ProtectedRoute>
              <Admin />
            </ProtectedRoute>
          }
        />
        <Route
          path="/cars"
          element={
            <ProtectedRoute>
              <CarList />
            </ProtectedRoute>
          }
        />
        <Route
          path="/customer-appointments"
          element={
            <ProtectedRoute>
              <CustomerAppointments />
            </ProtectedRoute>
          }
        />
        <Route
          path="/recon-appointments"
          element={
            <ProtectedRoute>
              <ReconAppointments />
            </ProtectedRoute>
          }
        />
        <Route
          path="/tasks"
          element={
            <ProtectedRoute>
              <Tasks />
            </ProtectedRoute>
          }
        />
        <Route
          path="/manual-verification"
          element={
            <ProtectedRoute>
              <ManualVerification />
            </ProtectedRoute>
          }
        />
        <Route
          path="/notes"
          element={
            <ProtectedRoute>
              <Notes />
            </ProtectedRoute>
          }
        />
        <Route
          path="/car-archive"
          element={
            <ProtectedRoute>
              <CarArchive />
            </ProtectedRoute>
          }
        />
      </Routes>
    </Router>
  );
}

export default App;