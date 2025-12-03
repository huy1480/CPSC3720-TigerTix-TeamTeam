const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const authRoutes = require('./routes/authRoutes');

const app = express();
const PORT = process.env.PORT || 6002;

// Updated CORS configuration to accept multiple origins
const allowedOrigins = process.env.AUTH_ALLOWED_ORIGINS
  ? process.env.AUTH_ALLOWED_ORIGINS.split(',')
  : [
      'http://localhost:3000',
      'https://3720-project.vercel.app',
      'https://cpsc-3720-tiger-tix-team-team-vtc2.vercel.app'
    ];

// Add wildcard support for Vercel preview deployments
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    // Check if origin is in allowed list
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } 
    // Allow any Vercel deployment URL
    else if (origin.endsWith('.vercel.app')) {
      callback(null, true);
    }
    // Allow any localhost origin (for development)
    else if (origin.startsWith('http://localhost:')) {
      callback(null, true);
    }
    else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['Set-Cookie']
};

app.use(cors(corsOptions));
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
