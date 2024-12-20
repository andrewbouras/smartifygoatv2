import React from 'react';
import AuthStatus from './components/AuthStatus';
import ProtectedContent from './components/ProtectedContent';
import { AuthProvider } from './context/AuthContext';
import './App.css';

function App() {
  return (
    <AuthProvider>
      <div className="app-container" style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
        <h1>Welcome to the App</h1>
        <AuthStatus />
        <ProtectedContent />
      </div>
    </AuthProvider>
  );
}

export default App; 