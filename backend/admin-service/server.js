/**
 * Admin Service Server
 * Main entry point for the admin microservice
 * Handles event creation and management on port 5001
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

// Initialize database on server start
if (typeof setupDatabase === 'function') {
  setupDatabase();
} else {
  console.error('setupDatabase is not a function');
}

// Routes
app.use('/api/admin', adminRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'Admin service is running' });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ 
    error: 'Internal server error',
    message: err.message 
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`Admin service running on port ${PORT}`);
});