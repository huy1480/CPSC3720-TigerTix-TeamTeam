/**
 * Client Controller
 * Handles event retrieval and ticket booking logic for users
 */

const clientModel = require('../models/clientModel');
const llmService = require('../services/llmService');

/**
 * Get all events
 */
exports.getEvents = async (req, res) => {
  try {
    const events = await clientModel.getAllEvents();
    res.status(200).json(events);
  } catch (error) {
    res.status(500).json({
      error: 'Failed to fetch events',
      details: error.message
    });
  }
};

/**
 * Purchase a ticket
 */
exports.purchaseTicket = async (req, res) => {
  const eventId = req.params.id;

  try {
    const result = await clientModel.purchaseTicket(eventId);
    res.status(200).json(result);
  } catch (error) {
    const status = error.status || 500;
    res.status(status).json({
      error: error.message || 'Failed to process purchase'
    });
  }
};

/**
 * Parse natural-language request
 */
exports.parseLLMRequest = async (req, res) => {
  const { text } = req.body;

  if (!text || !text.trim()) {
    return res.status(400).json({ error: 'Text is required for parsing' });
  }

  try {
    const events = await clientModel.getAllEvents();
    const structured = await llmService.parseUserInput(text, events);

    console.log("🔍 Parsed LLM:", structured);

    // ✅ Always expose focusEvent if one is matched
    if (structured.event) {
      structured.focusEvent = structured.event;
    }

    // ✅ Fix: if event detected but LLM mislabeled intent as greet → show event details
    if (structured.event && structured.intent === 'greet') {
      structured.intent = 'show_events';
    }

    // ✅ Show events logic (single or list)
    if (structured.intent === 'show_events') {

      structured.events = events; // ✅ never remove event list

      if (structured.focusEvent) {
        structured.message =
          structured.message ||
          `${structured.focusEvent.name} is on ${structured.focusEvent.date} and has ${structured.focusEvent.tickets} tickets remaining.`;
      } else {
        structured.message =
          structured.message ||
          'Here are the current events with tickets available.';
      }
    }

    // ✅ Greeting fallback
    if (structured.intent === 'greet') {
      structured.message =
        structured.message ||
        'Hey! I can list events or help you book tickets.';
    }

    // ✅ Booking flow
    if (structured.intent === 'book') {
      if (structured.event) {
        structured.message =
          structured.message ||
          `I found ${structured.event.name}. I can prepare ${structured.tickets} ticket(s). Should I confirm the booking?`;
        structured.needsConfirmation = Boolean(structured.eventId);
      } else if (structured.rawEventName) {
        structured.message =
          `I couldn't find "${structured.rawEventName}". Try "Show events" for available ones.`;
        structured.needsConfirmation = false;
      } else {
        structured.message =
          'Which event would you like to book tickets for?';
        structured.needsConfirmation = false;
      }
    }

    // ✅ Confirm booking
    if (structured.intent === 'confirm') {
      structured.message =
        structured.message ||
        'Please click confirm to finalize your booking.';
    }

    // ✅ Cancel
    if (structured.intent === 'cancel') {
      structured.message =
        structured.message ||
        'Okay! I’ll cancel that request.';
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
 * Confirm booking
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
