import React from 'react';

const QuestionBankButton = ({ bankId, title }) => {
  const openMCQPractice = () => {
    // Open the MCQ practice page with the specific question bank ID
    window.open(`http://localhost:3001/mcq/index.html?bank=${bankId}`, '_blank');
  };

  return (
    <button
      onClick={openMCQPractice}
      style={{
        backgroundColor: '#4a9eff',
        color: 'white',
        border: 'none',
        padding: '10px 20px',
        borderRadius: '4px',
        cursor: 'pointer',
        marginRight: '10px'
      }}
    >
      {title} MCQ Practice
    </button>
  );
};

export default QuestionBankButton;