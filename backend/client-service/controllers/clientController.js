const clientModel = require('../models/clientModel');

exports.getEvents = async (req, res) => {
  try {
    const events = await clientModel.getAllEvents();
    res.status(200).json(events);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch events', details: error.message });
  }
};

exports.purchaseTicket = async (req, res) => {
  const eventId = req.params.id;
  try {
    const result = await clientModel.purchaseTicket(eventId);
    res.status(200).json(result);
  } catch (error) {
    const status = error.status || 500;
    res.status(status).json({ error: error.message || 'Failed to process purchase' });
  }
};
