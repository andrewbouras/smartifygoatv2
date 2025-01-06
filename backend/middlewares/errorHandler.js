// Middleware to handle errors centrally
const handleErrors = (err, req, res, next) => {
    console.error('Error occurred:', err.message, err.stack);
    
    // Enhanced error handling based on error type
    if (err.name === 'ValidationError') {
      res.status(400).json({ status: 'error', message: 'Validation failed', errors: err.errors });
    } else if (err.name === 'UnauthorizedError') {
      res.status(401).json({ status: 'error', message: 'Unauthorized access' });
    } else {
      res.status(500).json({ status: 'error', message: err.message });
    }
  };
  
  module.exports = handleErrors;