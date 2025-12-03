const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const clientRoutes = require('./routes/clientRoutes');

const app = express();
const PORT = 6001;

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
app.use(cookieParser());
app.use(clientRoutes);

app.listen(PORT, () => {
  console.log(`Client service running on port ${PORT}`);
  console.log('CORS enabled for:');
  console.log('  - http://localhost:3000');
  console.log('  - https://3720-project.vercel.app');
  console.log('  - https://cpsc-3720-tiger-tix-team-team-vtc2.vercel.app');
  console.log('  - https://cpsc-3720-tiger-tix-team-team-vtc2-git-main-huy1480s-projects.vercel.app');
});
