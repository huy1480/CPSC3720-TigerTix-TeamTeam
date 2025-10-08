/**
 * Admin Routes
 * Defines API endpoints for admin service
 */

const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');

/**
 * POST /api/admin/events
 * Create new event
 * Body: { name: string, date: string, tickets: number }
 */
router.post('/events', adminController.createEvent);

/**
 * GET /api/admin/events
 * Get all events
 */
router.get('/events', adminController.getEvents);

/**
 * PUT /api/admin/events/:id
 * Update an existing event
 * Params: id (event ID)
 * Body: { name: string, date: string, tickets: number }
 */
router.put('/events/:id', adminController.updateEvent);

module.exports = router;