import axios from 'axios';

const instance = axios.create({
  baseURL: process.env.REACT_APP_API_URL || '', // Empty string uses proxy locally
  withCredentials: true,
});

instance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

export default instance;