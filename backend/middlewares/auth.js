const jwt = require('jsonwebtoken');

module.exports = function ensureAuthenticated(req, res, next) {
    // Try to get token from cookie first, then authorization header
    let token = req.cookies.jwt;
    
    if (!token) {
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
            token = authHeader.split(' ')[1];
        }
    }

    if (!token) {
        console.error('No authentication token found');
        return res.status(401).json({
            success: false,
            message: 'Authentication required'
        });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // Add user data to request object
        req.user = decoded;
        
        // Refresh token if it's close to expiring (optional)
        const tokenExp = decoded.exp * 1000; // Convert to milliseconds
        const now = Date.now();
        const sixHours = 6 * 60 * 60 * 1000;
        
        if (tokenExp - now < sixHours) {
            const newToken = jwt.sign(
                { id: decoded.id, email: decoded.email },
                process.env.JWT_SECRET,
                { expiresIn: '24h' }
            );
            
            res.cookie('jwt', newToken, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'lax',
                maxAge: 24 * 60 * 60 * 1000 // 24 hours
            });
        }

        next();
    } catch (error) {
        console.error('Token verification failed:', error.message);
        
        // Clear invalid token
        res.clearCookie('jwt');
        
        return res.status(401).json({
            success: false,
            message: 'Invalid or expired token'
        });
    }
};
