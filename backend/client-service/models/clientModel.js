/**
 * Client Model
 * Handles all database operations for retrieving events and processing ticket purchases
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Define path to shared SQLite database
const dbPath = path.join(__dirname, '../../shared-db/database.sqlite');

// Initialize database connection
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) console.error('Error connecting to database:', err.message);
  else console.log('Connected to shared SQLite database.');
});

/**
 * Get all events
 * Purpose: Retrieve all events for client display
 * 
 * @returns {Promise<Array>} Array of event objects
 */
exports.getAllEvents = () => {
  return new Promise((resolve, reject) => {
    // Query all events from the database
    db.all('SELECT * FROM events', [], (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
};

/**
 * Purchase a ticket
 * Purpose: Decrease ticket count for a specific event if available
 * 
 * @param {number} eventId - ID of the event to purchase a ticket for
 * @returns {Promise<Object>} Result message and remaining tickets
 */
exports.purchaseTicket = (eventId) => {
  return new Promise((resolve, reject) => {
    // Check if the event exists and retrieve current ticket count
    db.get('SELECT tickets FROM events WHERE id = ?', [eventId], (err, row) => {
      if (err) return reject(err);
      if (!row) return reject({ status: 404, message: 'Event not found' });
      if (row.tickets <= 0) return reject({ status: 400, message: 'Tickets sold out' });

      // Decrease ticket count by 1
      db.run('UPDATE events SET tickets = tickets - 1 WHERE id = ?', [eventId], function (updateErr) {
        if (updateErr) return reject(updateErr);

        // Return success message with updated ticket count
        resolve({
          message: 'Ticket purchased successfully',
          remaining: row.tickets - 1
        });
      });
    });
  });
};
