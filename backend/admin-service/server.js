/**
 * Admin Service Server
 * Main entry point for admin microservice
 * Event creation and management on port 5001
 */


const express = require('express');
const cors = require('cors');
const adminRoutes = require('./routes/adminRoutes');
const setupDatabase = require('./setup');

const app = express();
const PORT = process.env.PORT || 5001;

// Middleware
app.use(cors());
app.use(express.json());

// Initialize database and routes on start.
setupDatabase();
app.use('/api/admin', adminRoutes);

app.get('/health', (req, res) => {
    res.status(200).json({ status: 'Admin service is running' });
});

// Error handling.
app.use((err, req, res, next) => {
    res.status(500).json({
        error: 'Internal server error',
        message: err.message
    });
});

// Start server.
app.listen(PORT, () => {
    console.log('Admin service running on port ${PORT}');
});