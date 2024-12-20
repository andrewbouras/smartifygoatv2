const express = require('express');
const router = express.Router();
const handleErrors = require('../middlewares/errorHandler'); // Assuming errorHandler is exported from this path

// Route to get the current user session information
router.get('/session', handleErrors, (req, res) => {
    if (req.isAuthenticated()) {
        res.status(200).json({
            isAuthenticated: true,
            user: req.user
        });
    } else {
        res.status(401).json({
            isAuthenticated: false,
            message: 'User is not authenticated'
        });
    }
});

// Route to handle logging actions
router.post('/_log', handleErrors, (req, res) => {
    const { logMessage } = req.body;
    if (logMessage) {
        console.log(`Log entry: ${logMessage}`);
        res.status(200).json({ message: 'Log recorded successfully' });
    } else {
        res.status(400).json({ error: 'Log message is required' });
    }
});

module.exports = router;