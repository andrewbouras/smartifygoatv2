const jwt = require('jsonwebtoken');

const ensureAuthenticated = async (req, res, next) => {
  try {
    // Get token from cookies
    const token = req.cookies.jwt;
    
    if (!token) {
      return res.status(401).json({ message: 'No authentication token' });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = { id: decoded.id };
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(401).json({ message: 'Invalid token' });
  }
};

module.exports = { ensureAuthenticated }; 