import React from 'react';
import MCQButton from '../components/MCQButton';
import { useAuth } from '../context/AuthContext';

const Home = () => {
  const { user } = useAuth();

  const openIncorrectAnswers = () => {
    window.open('http://localhost:3001/mcq/incorrects.html', '_blank');
  };

  return (
    <div>
      <h1>Welcome to the App</h1>
      <p>Welcome, {user?.name}</p>
      <p>Profile</p>
      <button onClick={openIncorrectAnswers} 
        style={{
          backgroundColor: '#4a9eff',
          color: 'white',
          border: 'none',
          padding: '10px 20px',
          borderRadius: '4px',
          cursor: 'pointer',
          marginRight: '10px'
        }}>
        View Incorrect MCQ Answers
      </button>
      <button>Fetch Protected Data</button>
      <MCQButton />
    </div>
  );
};

export default Home; 