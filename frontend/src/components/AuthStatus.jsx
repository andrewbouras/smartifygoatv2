import React, { useState, useEffect } from 'react';
import LoginButton from './LoginButton';

const AuthStatus = () => {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [user, setUser] = useState(null);
  
    useEffect(() => {
      fetch('http://localhost:3001/api/verify-token', {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'Accept': '*/*',
        },
        method: 'POST',
        mode: 'cors'
      })
      .then(res => res.json())
      .then(data => {
        setIsAuthenticated(data.isValid);
        if (data.user) setUser(data.user);
      })
      .catch(err => {
        console.error('Auth check failed:', err);
        setIsAuthenticated(false);
        setUser(null);
      });
    }, []);
  
    return (
      <div>
        {isAuthenticated ? (
          <>
            <p>Welcome, {user?.name}</p>
            <img src={user?.image} alt="Profile" style={{ width: '50px', borderRadius: '50%' }} />
          </>
        ) : (
          <LoginButton />
        )}
      </div>
    );
  };

export default AuthStatus;