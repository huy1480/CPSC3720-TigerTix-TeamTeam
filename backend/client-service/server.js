const express = require('express');
const cors = require('cors');
const clientRoutes = require('./routes/clientRoutes');

const app = express();
app.use(cors());
app.use(express.json());
app.use(clientRoutes);

const PORT = 6001;
app.listen(PORT, () => console.log(`Client service running on port ${PORT}`));
