import React from 'react';
import AuthStatus from './components/AuthStatus';
import Home from './pages/Home';
import { AuthProvider } from './context/AuthContext';
import './App.css';

function App() {
  return (
    <AuthProvider>
      <div className="app-container" style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
        <AuthStatus />
        <Home />
      </div>
    </AuthProvider>
  );
}

export default App; 