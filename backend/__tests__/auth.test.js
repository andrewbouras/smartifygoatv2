const request = require('supertest');
const { app } = require('../server');
const User = require('../models/user');
const jwt = require('jsonwebtoken');

describe('Authentication Flow', () => {
    test('Google OAuth route should redirect to Google', async () => {
        const response = await request(app).get('/api/auth/google');
        expect(response.statusCode).toBe(302); // Redirect status
    });

    test('Protected route should require authentication', async () => {
        const response = await request(app).get('/api/protected-route');
        expect(response.statusCode).toBe(401);
    });

    test('Valid JWT should access protected routes', async () => {
        const token = jwt.sign({ id: 'test-id' }, process.env.JWT_SECRET);
        const response = await request(app)
            .get('/api/protected-route')
            .set('Cookie', [`jwt=${token}`]);
        expect(response.statusCode).toBe(200);
    });
});