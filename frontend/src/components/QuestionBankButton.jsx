import React from 'react';

const QuestionBankButton = ({ bankId, title }) => {
  const openMCQPractice = () => {
    // Open the MCQ practice page with the specific question bank ID
    window.open(`http://localhost:3001/mcq/index.html?bank=${bankId}`, '_blank');
  };

  return (
    <button 
      onClick={openMCQPractice}
      className="w-full p-4 text-left bg-gray-800 hover:bg-gray-700 rounded-lg"
    >
      {title}
    </button>
  );
};

export default QuestionBankButton;