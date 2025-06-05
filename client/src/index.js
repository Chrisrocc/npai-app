import React from 'react';
import ReactDOM from 'react-dom/client';
import './styles/index.css'; // Updated path
import App from './App';
import reportWebVitals from './utils/reportWebVitals'; // Updated path

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

reportWebVitals();