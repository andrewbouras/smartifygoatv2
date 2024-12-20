const express = require('express');
const router = express.Router();

// Middleware to handle redirection after authentication
router.use((req, res, next) => {
    // Check if the session has a saved URL to redirect to
    if (req.session && req.session.redirectTo) {
        const redirectTo = req.session.redirectTo;
        req.session.redirectTo = null; // Clear the redirect URL from the session
        res.redirect(redirectTo);
    } else {
        next();
    }
});

module.exports = router;