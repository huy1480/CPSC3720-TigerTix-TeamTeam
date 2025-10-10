/**
 * Admin Controller
 * Handles business logic and request/response for admin operations
 */

const adminModel = require('../models/adminModel');

/**
 * Validate event data
 * Purpose: Ensure all required fields are present and valid
 * 
 * @param {Object} eventData - Event data to validate
 * @returns {Object} Validation result with isValid flag and errors array
 */
function validateEventData(eventData) {
  const errors = [];
  
  // Check for required fields
  if (!eventData.name || eventData.name.trim() === '') {
    errors.push('Event name is required');
  }
  
  if (!eventData.date || eventData.date.trim() === '') {
    errors.push('Event date is required');
  }
  
  if (eventData.tickets === undefined || eventData.tickets === null) {
    errors.push('Number of tickets is required');
  } else if (typeof eventData.tickets !== 'number' || eventData.tickets < 0) {
    errors.push('Tickets must be a non-negative number');
  }
  
  // Validate date format (basic check for ISO format)
  if (eventData.date && !isValidDate(eventData.date)) {
    errors.push('Invalid date format. Use ISO format (YYYY-MM-DD)');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Check if date string is valid
 * Purpose: Validate date format
 * 
 * @param {string} dateString - Date to validate
 * @returns {boolean} True if valid date
 */
function isValidDate(dateString) {
  const date = new Date(dateString);
  return date instanceof Date && !isNaN(date);
}

/**
 * Create a new event
 * Purpose: Handle POST request to create an event
 * Expected input: req.body with name, date, tickets
 * Response: 201 with created event, or 400/500 with error
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function createEvent(req, res) {
  try {
    // Check if request body exists
    if (!req.body || Object.keys(req.body).length === 0) {
      return res.status(400).json({
        error: 'Invalid request',
        message: 'Request body is required'
      });
    }
    
    // Validate input data
    const validation = validateEventData(req.body);
    
    if (!validation.isValid) {
      return res.status(400).json({
        error: 'Invalid event data',
        details: validation.errors
      });
    }
    
    // Extract and sanitize data
    const eventData = {
      name: req.body.name.trim(),
      date: req.body.date.trim(),
      tickets: parseInt(req.body.tickets, 10)
    };
    
    // Create event in database
    const createdEvent = await adminModel.createEvent(eventData);
    
    // Return success response
    res.status(201).json({
      message: 'Event created successfully',
      event: createdEvent
    });
    
  } catch (error) {
    console.error('Error creating event:', error);
    res.status(500).json({
      error: 'Failed to create event',
      message: error.message
    });
  }
}

/**
 * Get all events
 * Purpose: Handle GET request to retrieve all events
 * Response: 200 with events array, or 500 with error
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function getEvents(req, res) {
  try {
    const events = await adminModel.getAllEvents();
    
    res.status(200).json({
      events,
      count: events.length
    });
    
  } catch (error) {
    console.error('Error fetching events:', error);
    res.status(500).json({
      error: 'Failed to fetch events',
      message: error.message
    });
  }
}

/**
 * Update an existing event
 * Purpose: Handle PUT request to update event details
 * Expected input: req.params.id and req.body with event data
 * Response: 200 with updated event, or 400/404/500 with error
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function updateEvent(req, res) {
  try {
    const eventId = parseInt(req.params.id, 10);
    
    // Validate event ID
    if (isNaN(eventId)) {
      return res.status(400).json({
        error: 'Invalid event ID'
      });
    }
    
    // Validate event data
    const validation = validateEventData(req.body);
    
    if (!validation.isValid) {
      return res.status(400).json({
        error: 'Invalid event data',
        details: validation.errors
      });
    }
    
    // Extract and sanitize data
    const eventData = {
      name: req.body.name.trim(),
      date: req.body.date.trim(),
      tickets: parseInt(req.body.tickets, 10)
    };
    
    // Update event in database
    const updatedEvent = await adminModel.updateEvent(eventId, eventData);
    
    res.status(200).json({
      message: 'Event updated successfully',
      event: updatedEvent
    });
    
  } catch (error) {
    console.error('Error updating event:', error);
    
    if (error.message === 'Event not found') {
      return res.status(404).json({
        error: 'Event not found',
        message: 'No event exists with the provided ID'
      });
    }
    
    res.status(500).json({
      error: 'Failed to update event',
      message: error.message
    });
  }
}

module.exports = {
  createEvent,
  getEvents,
  updateEvent
};