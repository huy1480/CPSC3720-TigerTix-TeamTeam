const express = require('express');
const cors = require('cors');
const adminRoutes = require('./routes/adminRoutes');
const setupDatabase = require('./setup');

const app = express();
const PORT = process.env.PORT || 5001;

// CORS Configuration - Allow BOTH Vercel deployments
app.use(cors({
  origin: 'https://cpsc-3720-tiger-tix-team-team-vtc2.vercel.app',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Cookie'],
  exposedHeaders: ['Set-Cookie'],
  preflightContinue: false,
  optionsSuccessStatus: 204
}));

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
  console.log('CORS enabled for:');
  console.log('  - http://localhost:3000');
  console.log('  - https://cpsc-3720-tiger-tix-team-team-vtc2.vercel.app');
  console.log('  - https://cpsc-3720-tiger-tix-team-team-vtc2-git-main-huy1480s-projects.vercel.app');
});
