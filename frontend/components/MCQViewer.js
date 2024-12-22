async function loadMCQs() {
  try {
    const sourceFile = 'your_source_file.json'; // Get this from props or URL
    const response = await fetch(`/api/questionbank/${sourceFile}`);
    const data = await response.json();
    
    if (!data.mcqs) {
      throw new Error('Invalid MCQ format');
    }
    
    displayMCQs(data.mcqs);
  } catch (error) {
    console.error('Error loading MCQs:', error);
    document.getElementById('mcq-container').textContent = 
      'Error loading MCQs: ' + error.message;
  }
} 