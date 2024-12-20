import React from 'react';

const MCQButton = () => {
  const handleMCQClick = () => {
    window.open('http://localhost:3001/mcq/index.html', '_blank');
  };

  return (
    <button 
      onClick={handleMCQClick}
      style={{
        padding: '10px 20px',
        fontSize: '16px',
        backgroundColor: '#2a2a2a',
        color: '#e0e0e0',
        border: '1px solid #444',
        borderRadius: '4px',
        cursor: 'pointer',
        marginTop: '20px'
      }}
    >
      Open MCQ Practice
    </button>
  );
};

export default MCQButton; 