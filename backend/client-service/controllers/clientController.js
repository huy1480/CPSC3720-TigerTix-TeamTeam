/**
 * Client Controller
 * Handles event retrieval and ticket purchasing logic for users
 */

const clientModel = require('../models/clientModel');
const llmService = require('../services/llmService');

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

/**
 * Parse a natural language request using the LLM pipeline with keyword fallback
 *
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
exports.parseLLMRequest = async (req, res) => {
  const { text } = req.body;

  if (!text || !text.trim()) {
    return res.status(400).json({ error: 'Text is required for parsing' });
  }

  try {
    const events = await clientModel.getAllEvents();
    const structured = await llmService.parseUserInput(text, events);

    if (structured.intent === 'show_events') {
      structured.events = events;
      structured.message =
        structured.message ||
        'Here are the current events with tickets available.';

        //structured.eventsList = events.map(e => `${e.name} - $${e.price}`);

    }

    if (structured.intent === 'greet') {
      structured.message =
        structured.message ||
        'Hi there! I can list events and help prepare a ticket booking for you.';
    }

    if (structured.intent === 'book') {
      if (structured.event) {
        structured.message =
          structured.message ||
          `I found ${structured.event.name}. I can prepare ${structured.tickets} ticket(s). Should I confirm the booking?`;
        structured.needsConfirmation =
          Boolean(structured.needsConfirmation) && Boolean(structured.eventId);
      } else if (structured.rawEventName) {
        structured.message = `I could not find an event named "${structured.rawEventName}". Try asking for "Show events" to see what's available.`;
        structured.needsConfirmation = false;
      } else {
        structured.message = 'Which event would you like to book tickets for?';
        structured.needsConfirmation = false;
      }
    }

    if (structured.intent === 'confirm') {
      structured.message =
        structured.message ||
        'Please click the confirm button to finalize your booking.';
    }

    if (structured.intent === 'cancel') {
      structured.message =
        structured.message ||
        'Okay, I will cancel that booking request.';
    }

    res.status(200).json(structured);
  } catch (error) {
    const status = error.status || 500;
    res.status(status).json({
      error: error.message || 'Failed to parse request'
    });
  }
};

/**
 * Confirm a booking after the user has explicitly approved it
 *
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
exports.confirmBooking = async (req, res) => {
  const { eventId, tickets, customerName } = req.body || {};

  if (eventId == null || tickets == null) {
    return res
      .status(400)
      .json({ error: 'eventId and tickets are required to confirm a booking' });
  }

  try {
    const confirmation = await clientModel.confirmBooking(
      eventId,
      tickets,
      customerName || 'Guest'
    );

    res.status(200).json({
      message: `Booked ${confirmation.requestedTickets} ticket(s) for ${confirmation.event.name}.`,
      bookingId: confirmation.bookingId,
      event: confirmation.event,
      remaining: confirmation.remainingTickets
    });
  } catch (error) {
    const status = error.status || 500;
    res.status(status).json({
      error: error.message || 'Failed to confirm booking'
    });
  }
};
