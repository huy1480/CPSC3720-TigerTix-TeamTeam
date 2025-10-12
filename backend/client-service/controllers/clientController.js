/**
 * Client Controller
 * Handles event retrieval and ticket purchasing logic for users
 */

const clientModel = require('../models/clientModel');

/**
 * Get all events
 * Purpose: Handle GET request to fetch all available events
 * Response: 200 with events list, or 500 with error details
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.getEvents = async (req, res) => {
  try {
    // Retrieve all events from the database
    const events = await clientModel.getAllEvents();

    // Return events as JSON response
    res.status(200).json(events);
  } catch (error) {
    // Return 500 error if fetching fails
    res.status(500).json({
      error: 'Failed to fetch events',
      details: error.message
    });
  }
};

/**
 * Purchase a ticket
 * Purpose: Handle POST request to process ticket purchase for an event
 * Expected input: req.params.id - ID of the event to purchase a ticket for
 * Response: 200 with updated ticket info, or 4xx/500 with error details
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.purchaseTicket = async (req, res) => {
  const eventId = req.params.id;
  try {
    // Attempt to purchase a ticket for the given event ID
    const result = await clientModel.purchaseTicket(eventId);

    // Return purchase result as JSON response
    res.status(200).json(result);
  } catch (error) {
    // Return error status and message if purchase fails
    const status = error.status || 500;
    res.status(status).json({
      error: error.message || 'Failed to process purchase'
    });
  }
};
