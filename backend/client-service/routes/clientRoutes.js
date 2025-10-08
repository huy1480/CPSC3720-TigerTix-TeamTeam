const express = require('express');
const router = express.Router();
const clientController = require('../controllers/clientController');

router.get('/api/events', clientController.getEvents);
router.post('/api/events/:id/purchase', clientController.purchaseTicket);

module.exports = router;
