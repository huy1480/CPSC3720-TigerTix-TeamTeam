/**
 * Client Controller
 * Handles event retrieval and ticket booking logic for users
 */

const clientModel = require('../models/clientModel');
const llmService = require('../services/llmService');

/**
 * GET - Retrieve all events
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
 * ✅ NEW: GET - Find event by name (search)
 */
exports.getEventByName = async (req, res) => {
  try {
    const eventName = req.query.name;
    const event = await clientModel.findEventByName(eventName);

    if (!event) {
      return res.status(404).json({
        message: `No event found matching "${eventName}".`
      });
    }

    res.status(200).json(event);
  } catch (error) {
    res.status(500).json({
      error: 'Failed to fetch event details',
      details: error.message
    });
  }
};

/**
 * ✅ NEW: GET - Find event by ID
 */
exports.getEventById = async (req, res) => {
  try {
    const eventId = req.params.id;
    const event = await clientModel.getEventById(eventId);

    if (!event) {
      return res.status(404).json({ message: 'Event not found.' });
    }

    res.status(200).json(event);
  } catch (error) {
    res.status(500).json({
      error: 'Failed to fetch event',
      details: error.message
    });
  }
};

/**
 * POST - Purchase a ticket immediately (legacy flow)
 */
exports.purchaseTicket = async (req, res) => {
  const eventId = req.params.id;
  const purchaser = req.user?.email || 'Authenticated Guest';
  try {
    const result = await clientModel.purchaseTicket(eventId, purchaser);
    res.status(200).json(result);
  } catch (error) {
    const status = error.status || 500;
    res.status(status).json({
      error: error.message || 'Failed to process purchase'
    });
  }
};

/**
 * POST - Natural-language request
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

    if (structured.event) {
      structured.focusEvent = structured.event;
    }

    /**
     * ✅ Event Details Only (NO event list)
     */
    if (structured.intent === 'event_details') {
      if (structured.focusEvent) {
        structured.message = `${structured.event.name} is on ${structured.event.date} and has ${structured.event.tickets} tickets remaining.`;
      } else {
        structured.message = `I couldn't find "${structured.rawEventName}". Try "Show events" for available ones.`;
      }

      return res.status(200).json(structured);
    }

    /**
     * ✅ Show ALL events (list)
     */
    if (structured.intent === 'show_events') {
      structured.events = events;
      structured.message =
        structured.message ||
        'Here are the current events with tickets available.';
      return res.status(200).json(structured);
    }

    /**
     * ✅ Greetings
     */
    if (structured.intent === 'greet') {
      structured.message =
        'Hey! I can show events or help you book tickets.';
      return res.status(200).json(structured);
    }

    /**
     * ✅ Booking Flow
     */
    if (structured.intent === 'book') {
      if (structured.event) {
        structured.message =
          structured.message ||
          `I found ${structured.event.name}. I can prepare ${structured.tickets} ticket(s). Should I confirm the booking?`;
        structured.needsConfirmation = Boolean(structured.eventId);
      } else {
        structured.message = `I couldn't find "${structured.rawEventName}". Try "Show events" to browse.`;
        structured.needsConfirmation = false;
      }
      return res.status(200).json(structured);
    }

    /**
     * ✅ Confirm Booking Prompt
     */
    if (structured.intent === 'confirm') {
      structured.message =
        'Please click confirm to finalize your booking.';
      return res.status(200).json(structured);
    }

    /**
     * ✅ Cancel Booking
     */
    if (structured.intent === 'cancel') {
      structured.message = 'Okay! I’ll cancel that request.';
      return res.status(200).json(structured);
    }

    /**
     * ✅ Everything else → unknown
     */
    structured.message =
      structured.message || "I didn't understand that. Try asking about events.";
    res.status(200).json(structured);

  } catch (error) {
    const status = error.status || 500;
    res.status(status).json({
      error: error.message || 'Failed to parse request'
    });
  }
};

/**
 * POST - Confirm Booking
 */
exports.confirmBooking = async (req, res) => {
  const { eventId, tickets, customerName } = req.body || {};

  if (eventId == null || tickets == null) {
    return res
      .status(400)
      .json({ error: 'eventId and tickets are required to confirm' });
  }

  try {
    const confirmation = await clientModel.confirmBooking(
      eventId,
      tickets,
      customerName || req.user?.email || 'Guest'
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
