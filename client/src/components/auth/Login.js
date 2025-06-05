import React, { useState, useEffect } from 'react';
import axios from '../../utils/axiosConfig'; // Updated path
import { useNavigate, useParams } from 'react-router-dom';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [forgotPassword, setForgotPassword] = useState(false);
  const [resetPassword, setResetPassword] = useState(false);
  const [verifyEmail, setVerifyEmail] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [message, setMessage] = useState(null);
  const navigate = useNavigate();
  const { token } = useParams();

  // Handle email verification
  useEffect(() => {
    if (token && window.location.pathname.startsWith('/verify')) {
      setVerifyEmail(true);
      const verifyEmailToken = async () => {
        try {
          setLoading(true);
          const response = await axios.get(`/api/auth/verify/${token}`);
          setMessage(response.data.message);
          setLoading(false);
          setTimeout(() => {
            navigate('/login');
          }, 2000);
        } catch (err) {
          setError(err.response?.data?.message || 'Error verifying email');
          setLoading(false);
          setTimeout(() => {
            navigate('/login');
          }, 2000);
        }
      };
      verifyEmailToken();
    } else if (token && window.location.pathname.startsWith('/reset-password')) {
      setResetPassword(true);
    }
  }, [token, navigate]);

  // Handle Login
  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await axios.post('/api/auth/login', {
        email,
        password,
      });
      setLoading(false);
      navigate('/dashboard');
    } catch (err) {
      setLoading(false);
      setError(err.response?.data?.message || 'Error logging in');
    }
  };

  // Handle Forgot Password
  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      const response = await axios.post('/api/auth/forgot-password', {
        email,
      });
      setLoading(false);
      setMessage(response.data.message);
    } catch (err) {
      setLoading(false);
      setError(err.response?.data?.message || 'Error sending reset email');
    }
  };

  // Handle Reset Password
  const handleResetPassword = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      const response = await axios.post(
        `/api/auth/reset-password/${token}`,
        {
          password: newPassword,
        }
      );
      setLoading(false);
      setMessage(response.data.message);
      setTimeout(() => {
        navigate('/login');
      }, 2000);
    } catch (err) {
      setLoading(false);
      setError(err.response?.data?.message || 'Error resetting password');
    }
  };

  if (verifyEmail) {
    return (
      <div style={{ padding: '20px', fontFamily: "'Roboto', sans-serif", maxWidth: '400px', margin: '0 auto' }}>
        <h2 style={{ textAlign: 'center', marginBottom: '20px' }}>Verifying Email</h2>
        {message && <div style={{ color: 'green', textAlign: 'center', marginBottom: '10px' }}>{message}</div>}
        {error && <div style={{ color: 'red', textAlign: 'center', marginBottom: '10px' }}>{error}</div>}
        {loading && <div style={{ textAlign: 'center' }}>Verifying...</div>}
      </div>
    );
  }

  if (resetPassword) {
    return (
      <div style={{ padding: '20px', fontFamily: "'Roboto', sans-serif", maxWidth: '400px', margin: '0 auto' }}>
        <h2 style={{ textAlign: 'center', marginBottom: '20px' }}>Reset Password</h2>
        {message && <div style={{ color: 'green', textAlign: 'center', marginBottom: '10px' }}>{message}</div>}
        {error && <div style={{ color: 'red', textAlign: 'center', marginBottom: '10px' }}>{error}</div>}
        <form onSubmit={handleResetPassword}>
          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '5px' }}>New Password</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              style={{ width: '100%', padding: '8px', border: '1px solid #ced4da', borderRadius: '4px' }}
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '10px',
              backgroundColor: '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: loading ? 'not-allowed' : 'pointer',
            }}
          >
            {loading ? 'Resetting...' : 'Reset Password'}
          </button>
        </form>
      </div>
    );
  }

  if (forgotPassword) {
    return (
      <div style={{ padding: '20px', fontFamily: "'Roboto', sans-serif", maxWidth: '400px', margin: '0 auto' }}>
        <h2 style={{ textAlign: 'center', marginBottom: '20px' }}>Forgot Password</h2>
        {message && <div style={{ color: 'green', textAlign: 'center', marginBottom: '10px' }}>{message}</div>}
        {error && <div style={{ color: 'red', textAlign: 'center', marginBottom: '10px' }}>{error}</div>}
        <form onSubmit={handleForgotPassword}>
          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '5px' }}>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={{ width: '100%', padding: '8px', border: '1px solid #ced4da', borderRadius: '4px' }}
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '10px',
              backgroundColor: '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: loading ? 'not-allowed' : 'pointer',
            }}
          >
            {loading ? 'Sending...' : 'Send Reset Link'}
          </button>
        </form>
        <button
          onClick={() => setForgotPassword(false)}
          style={{
            width: '100%',
            padding: '10px',
            backgroundColor: '#6c757d',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            marginTop: '10px',
            cursor: 'pointer',
          }}
        >
          Back to Login
        </button>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px', fontFamily: "'Roboto', sans-serif", maxWidth: '400px', margin: '0 auto' }}>
      <h2 style={{ textAlign: 'center', marginBottom: '20px' }}>Login</h2>
      {error && <div style={{ color: 'red', textAlign: 'center', marginBottom: '10px' }}>{error}</div>}
      <form onSubmit={handleLogin}>
        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px' }}>Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={{ width: '100%', padding: '8px', border: '1px solid #ced4da', borderRadius: '4px' }}
          />
        </div>
        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px' }}>Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            style={{ width: '100%', padding: '8px', border: '1px solid #ced4da', borderRadius: '4px' }}
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          style={{
            width: '100%',
            padding: '10px',
            backgroundColor: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: loading ? 'not-allowed' : 'pointer',
          }}
        >
          {loading ? 'Logging in...' : 'Login'}
        </button>
      </form>
      <button
        onClick={() => navigate('/signup')}
        style={{
          width: '100%',
          padding: '10px',
          background: 'none',
          border: 'none',
          color: '#007bff',
          marginTop: '10px',
          cursor: 'pointer',
        }}
      >
        Don’t have an account? Sign up
      </button>
      <button
        onClick={() => setForgotPassword(true)}
        style={{
          width: '100%',
          padding: '10px',
          background: 'none',
          border: 'none',
          color: '#007bff',
          marginTop: '10px',
          cursor: 'pointer',
        }}
      >
        Forgot Password?
      </button>
    </div>
  );
};

export default Login;