import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';
import { AuthProvider } from './context/AuthContext.jsx';
import { EventProvider } from './context/EventContext.jsx';
import { ConfirmProvider } from './context/ConfirmContext.jsx';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AuthProvider>
      <EventProvider>
        <ConfirmProvider>
          <App />
        </ConfirmProvider>
      </EventProvider>
    </AuthProvider>
  </React.StrictMode>
);
