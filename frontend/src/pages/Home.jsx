import React from 'react';
import MCQButton from '../components/MCQButton';
import QuestionBankButton from '../components/QuestionBankButton';
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
      
      <h2>Question Banks</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <QuestionBankButton 
          bankId="mehlman-anatomy" 
          title="HY Anatomy/Rheum/MSK" 
          sourceFile="Mehlman Anatomy_factoids.json"
        />
        <QuestionBankButton 
          bankId="mehlman-microbiology" 
          title="HY Microbiology" 
          sourceFile="Microbiology_factoids.json"
        />
        <QuestionBankButton 
          bankId="mehlman-pharmacology" 
          title="HY Pharmacology" 
          sourceFile="Pharmacology_factoids.json"
        />
        <QuestionBankButton 
          bankId="mehlman-biochemistry" 
          title="HY Biochemistry" 
          sourceFile="Biochemistry_factoids.json"
        />
        <QuestionBankButton 
          bankId="mehlman-psychology" 
          title="HY Psychiatry" 
          sourceFile="Psychology_factoids.json"
        />
        <QuestionBankButton 
          bankId="obgyn" 
          title="HY OBGYN/Repro" 
          sourceFile="HY Obgyn:repro.txt"
        />
      </div>

      <div style={{ marginTop: '20px' }}>
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
      </div>
    </div>
  );
};

export default Home; 