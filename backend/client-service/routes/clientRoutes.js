/**
 * Client Routes
 * Defines API endpoints for client service
 */

const express = require('express');
const router = express.Router();
const clientController = require('../controllers/clientController');

/**
 * GET /api/events
 * Retrieve all available events for users
 * Response: 200 with events array
 */
router.get('/api/events', clientController.getEvents);

/**
 * POST /api/events/:id/purchase
 * Purchase a ticket for a specific event
 * Params: id (event ID)
 * Response: 200 with purchase confirmation or error
 */
router.post('/api/events/:id/purchase', clientController.purchaseTicket);

module.exports = router;
