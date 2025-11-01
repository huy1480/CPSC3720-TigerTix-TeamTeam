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

// Ensure bookings table exists for transactional storage
db.serialize(() => {
  db.run(
    `CREATE TABLE IF NOT EXISTS bookings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      event_id INTEGER NOT NULL,
      quantity INTEGER NOT NULL CHECK (quantity > 0),
      customer_name TEXT DEFAULT 'Guest',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (event_id) REFERENCES events(id)
    )`
  );
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
  return exports
    .confirmBooking(eventId, 1, 'Direct Purchase')
    .then((result) => ({
      message: 'Ticket purchased successfully',
      remaining: result.remainingTickets,
      bookingId: result.bookingId,
      event: result.event
    }));
};

/**
 * Retrieve a single event by ID
 *
 * @param {number} eventId - Event identifier
 * @returns {Promise<Object|null>} Event record or null if not found
 */
exports.getEventById = (eventId) => {
  const parsedId = Number(eventId);
  return new Promise((resolve, reject) => {
    if (!Number.isInteger(parsedId) || parsedId <= 0) {
      return reject({ status: 400, message: 'Invalid event id' });
    }

    db.get('SELECT * FROM events WHERE id = ?', [parsedId], (err, row) => {
      if (err) return reject(err);
      resolve(row || null);
    });
  });
};

/**
 * Find an event using a case-insensitive name match
 *
 * @param {string} eventName - Event name fragment
 * @returns {Promise<Object|null>} Matching event or null
 */
exports.findEventByName = (eventName) => {
  if (!eventName) return Promise.resolve(null);
  const cleaned = eventName.trim().toLowerCase();
  return new Promise((resolve, reject) => {
    db.get(
      'SELECT * FROM events WHERE LOWER(name) = ?',
      [cleaned],
      (err, rowExact) => {
        if (err) return reject(err);
        if (rowExact) return resolve(rowExact);

        db.get(
          'SELECT * FROM events WHERE LOWER(name) LIKE ?',
          [`%${cleaned}%`],
          (likeErr, rowLike) => {
            if (likeErr) return reject(likeErr);
            resolve(rowLike || null);
          }
        );
      }
    );
  });
};

/**
 * Confirm a booking using a database transaction to prevent overselling
 *
 * @param {number} eventId - Event identifier
 * @param {number} quantity - Number of tickets to reserve
 * @param {string} [customerName='Guest'] - Optional customer name metadata
 * @returns {Promise<Object>} Booking confirmation payload
 */
exports.confirmBooking = (eventId, quantity, customerName = 'Guest') => {
  const parsedId = Number(eventId);
  const parsedQty = Number(quantity);

  return new Promise((resolve, reject) => {
    if (!Number.isInteger(parsedId) || parsedId <= 0) {
      return reject({ status: 400, message: 'Invalid event id' });
    }
    if (!Number.isInteger(parsedQty) || parsedQty <= 0) {
      return reject({ status: 400, message: 'Ticket quantity must be a positive integer' });
    }

    let bookingId;
    let selectedEvent;

    const rollback = (error) => {
      db.run('ROLLBACK', (rollbackErr) => {
        if (rollbackErr) {
          console.error('Rollback failed:', rollbackErr.message);
        }
        reject(error);
      });
    };

    db.serialize(() => {
      db.run('BEGIN IMMEDIATE TRANSACTION', (beginErr) => {
        if (beginErr) return reject(beginErr);

        db.get(
          'SELECT id, name, date, tickets FROM events WHERE id = ?',
          [parsedId],
          (selectErr, eventRow) => {
            if (selectErr) return rollback(selectErr);
            if (!eventRow) return rollback({ status: 404, message: 'Event not found' });
            if (eventRow.tickets < parsedQty) {
              return rollback({
                status: 400,
                message: `Only ${eventRow.tickets} tickets remaining for ${eventRow.name}`
              });
            }

            selectedEvent = eventRow;

            db.run(
              'UPDATE events SET tickets = tickets - ? WHERE id = ?',
              [parsedQty, parsedId],
              (updateErr) => {
                if (updateErr) return rollback(updateErr);

                db.run(
                  'INSERT INTO bookings (event_id, quantity, customer_name) VALUES (?, ?, ?)',
                  [parsedId, parsedQty, customerName || 'Guest'],
                  function insertCallback(insertErr) {
                    if (insertErr) return rollback(insertErr);

                    bookingId = this.lastID;
                    selectedEvent = {
                      ...selectedEvent,
                      tickets: selectedEvent.tickets - parsedQty
                    };

                    db.run('COMMIT', (commitErr) => {
                      if (commitErr) return rollback(commitErr);

                      resolve({
                        bookingId,
                        event: {
                          id: selectedEvent.id,
                          name: selectedEvent.name,
                          date: selectedEvent.date
                        },
                        requestedTickets: parsedQty,
                        remainingTickets: selectedEvent.tickets
                      });
                    });
                  }
                );
              }
            );
          }
        );
      });
    });
  });
};
