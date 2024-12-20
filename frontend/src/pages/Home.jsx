import React from 'react';
import MCQButton from '../components/MCQButton';
import { useAuth } from '../context/AuthContext';

const Home = () => {
  const { user } = useAuth();

  return (
    <div>
      <h1>Welcome to the App</h1>
      <p>Welcome, {user?.name}</p>
      <p>Profile</p>
      <button>Fetch Protected Data</button>
      <MCQButton />
    </div>
  );
};

export default Home; 