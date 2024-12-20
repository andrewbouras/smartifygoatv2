import React from 'react';

const LoginButton = () => {
    const handleLogin = () => {
      // Use local backend URL for development
      window.location.href = 'http://localhost:3001/api/auth/google';
    };
  
    return <button onClick={handleLogin}>Login with Google</button>;
};

export default LoginButton;