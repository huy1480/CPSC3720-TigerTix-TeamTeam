/**
 * Admin Service Server
 * Main entry point for the admin microservice
 * Handles event creation and management
 */

const express = require('express');
const cors = require('cors');
const adminRoutes = require('./routes/adminRoutes');
const setupDatabase = require('./setup');

const app = express();
const PORT = process.env.PORT || 5001;

app.use(cors());
app.use(express.json());

if (typeof setupDatabase === 'function') {
  setupDatabase();
} else {
  console.error('setupDatabase is not a function');
}

app.use('/api/admin', adminRoutes);

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'Admin service is running' });
});

app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ 
    error: 'Internal server error',
    message: err.message 
  });
});

app.listen(PORT, () => {
  console.log(`Admin service running on port ${PORT}`);
});