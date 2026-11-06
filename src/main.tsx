import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { addCollection } from '@iconify/react';
import solar from '@iconify-json/solar/icons.json';
import App from './App';
import './index.css';

// Iconos incluidos en el bundle (funciona sin conexión a la API de Iconify)
addCollection(solar as Parameters<typeof addCollection>[0]);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
