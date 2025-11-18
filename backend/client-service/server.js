const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const clientRoutes = require('./routes/clientRoutes');

const app = express();
const allowedOrigins = process.env.CLIENT_ALLOWED_ORIGINS
  ? process.env.CLIENT_ALLOWED_ORIGINS.split(',')
  : ['http://localhost:3000'];

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true
  })
);
app.use(express.json());
app.use(cookieParser());
app.use(clientRoutes);

const PORT = 6001;
app.listen(PORT, () => console.log(`Client service running on port ${PORT}`));
