const express = require('express');
const passport = require('passport');
const router = express.Router();
const User = require('../models/user');
const jwt = require('jsonwebtoken');

// Google OAuth login route
router.get('/auth/google', passport.authenticate('google', {
    scope: ['profile', 'email']
}));

// Google OAuth callback route
router.get('/auth/google/callback', 
    passport.authenticate('google', { failureRedirect: '/login' }),
    (req, res) => {
        // User has been authenticated, get the token from the user object
        const token = req.user.token;
        
        // Set token in HTTP-only cookie
        res.cookie('jwt', token, {
            httpOnly: true,
            secure: false,
            sameSite: 'lax',
            domain: 'localhost',
            path: '/',
            maxAge: 24 * 60 * 60 * 1000 // 24 hours
        });

        // Redirect to frontend
        res.redirect('http://localhost:3000');
    }
);

// Verify token endpoint
router.post('/verify-token', async (req, res) => {
    console.log('Verify token request received');
    console.log('Cookies:', req.cookies);
    console.log('Session:', req.session);
    
    const token = req.cookies.jwt;

    if (!token) {
        console.log('No token found in cookies');
        return res.status(401).json({ 
            isValid: false, 
            message: 'No token provided' 
        });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        console.log('Token decoded:', decoded);
        
        const user = await User.findById(decoded.id);
        
        if (!user) {
            console.log('User not found for decoded token');
            throw new Error('User not found');
        }

        console.log('User found:', user);
        
        res.json({ 
            isValid: true, 
            user: {
                id: user._id,
                email: user.email,
                name: user.name,
                image: user.image
            }
        });
    } catch (error) {
        console.error('Token verification error:', error);
        res.status(401).json({ 
            isValid: false, 
            message: 'Invalid token',
            error: error.message
        });
    }
});

// Logout route
router.post('/logout', (req, res) => {
    res.clearCookie('jwt');
    req.logout(() => {
        res.json({ success: true });
    });
});

module.exports = router;
