/**
 * Client Routes
 * Defines API endpoints for client service
 */

const express = require('express');
const router = express.Router();
const clientController = require('../controllers/clientController');
const {
  requireAuth,
  attachUserIfAvailable
} = require('../middleware/authMiddleware');

router.use(attachUserIfAvailable);

/**
 * GET /api/events
 * Retrieve all available events for users
 * Response: 200 with events array
 */
router.get('/api/events', clientController.getEvents);

/**
 * ✅ NEW — Get specific event by name (search)
 * Example: /api/events/search?name=Jazz%20Night
 */
router.get('/api/events/search', clientController.getEventByName);

/**
 * ✅ NEW — Get specific event by ID
 * Example: /api/events/3
 */
router.get('/api/events/:id', clientController.getEventById);

/**
 * POST /api/events/:id/purchase
 * Purchase a ticket for a specific event
 * Params: id (event ID)
 * Response: 200 with purchase confirmation or error
 */
router.post(
  '/api/events/:id/purchase',
  requireAuth,
  clientController.purchaseTicket
);

/**
 * POST /api/llm/parse
 * Parse natural-language input describing booking intent
 */
router.post('/api/llm/parse', clientController.parseLLMRequest);

/**
 * POST /api/bookings/confirm
 * Finalize a booking after explicit confirmation
 */
router.post(
  '/api/bookings/confirm',
  requireAuth,
  clientController.confirmBooking
);

module.exports = router;
