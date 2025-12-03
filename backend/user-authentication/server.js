const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const authRoutes = require('./routes/authRoutes');

const app = express();
const PORT = process.env.PORT || 6002;

const allowedOrigins = (process.env.AUTH_ALLOWED_ORIGINS || '')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

if (allowedOrigins.length === 0) {
  allowedOrigins.push(
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'https://cpsc-3720-tiger-tix-team-team-vtc2.vercel.app'
  );
}

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Cookie'],
  exposedHeaders: ['Set-Cookie'],
  preflightContinue: false,
  optionsSuccessStatus: 204
}));

app.use(express.json());
app.use(cookieParser());

app.use('/api/auth', authRoutes);

app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'User authentication service is running' });
});

app.use((err, _req, res, _next) => {
  console.error('Auth service error:', err);
  res.status(500).json({ error: 'Internal authentication service error' });
});

app.listen(PORT, () => {
  console.log(`User authentication service listening on port ${PORT}`);
  console.log('CORS enabled for:');
  console.log('  - http://localhost:3000');
  console.log('  - https://cpsc-3720-tiger-tix-team-team-vtc2.vercel.app');
  console.log('  - https://cpsc-3720-tiger-tix-team-team-vtc2-git-main-huy1480s-projects.vercel.app');
});

module.exports = app;
