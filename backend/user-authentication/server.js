const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const authRoutes = require('./routes/authRoutes');

const app = express();
const PORT = process.env.PORT || 6002;
const allowedOrigins = process.env.AUTH_ALLOWED_ORIGINS
  ? process.env.AUTH_ALLOWED_ORIGINS.split(',')
  : ['http://localhost:3000'];

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true
  })
);
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
});

module.exports = app;
