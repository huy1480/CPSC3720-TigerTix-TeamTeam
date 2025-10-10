/**
 * Client Model
 * Handles database operations for event browsing and ticket purchases
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const DB_PATH = path.join(__dirname, '../../shared-db/database.sqlite');

/**
 * Get all events from database
 * Purpose: Retrieve all events for client browsing
 * 
 * @returns {Promise<Array>} Array of all events
 */
function getAllEvents() {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(DB_PATH, (err) => {
      if (err) {
        console.error('Error connecting to database:', err.message);
        reject(err);
        return;
      }
    });
    
    const query = 'SELECT id, name, date, tickets FROM events ORDER BY date ASC';
    
    db.all(query, [], (err, rows) => {
      db.close();
      
      if (err) {
        reject(err);
        return;
      }
      
      resolve(rows || []);
    });
  });
}

/**
 * Get a single event by ID
 * Purpose: Retrieve specific event details
 * 
 * @param {number} id - Event ID
 * @returns {Promise<Object>} Event object or null if not found
 */
function getEventById(id) {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(DB_PATH);
    
    const query = 'SELECT id, name, date, tickets FROM events WHERE id = ?';
    
    db.get(query, [id], (err, row) => {
      db.close();
      
      if (err) {
        reject(err);
        return;
      }
      
      resolve(row || null);
    });
  });
}

/**
 * Purchase a ticket for an event (atomic operation)
 * Purpose: Decrement ticket count safely to prevent overselling
 * Uses transaction to ensure atomicity and prevent race conditions
 * 
 * @param {number} eventId - Event ID
 * @returns {Promise<Object>} Updated event or error
 */
function purchaseTicket(eventId) {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(DB_PATH);
    
    // Begin transaction for atomic update
    db.serialize(() => {
      db.run('BEGIN TRANSACTION');
      
      // First, check current ticket count
      const checkQuery = 'SELECT id, name, date, tickets FROM events WHERE id = ?';
      
      db.get(checkQuery, [eventId], (err, event) => {
        if (err) {
          db.run('ROLLBACK');
          db.close();
          reject(err);
          return;
        }
        
        // Event not found
        if (!event) {
          db.run('ROLLBACK');
          db.close();
          reject(new Error('Event not found'));
          return;
        }
        
        // No tickets available
        if (event.tickets <= 0) {
          db.run('ROLLBACK');
          db.close();
          reject(new Error('No tickets available'));
          return;
        }
        
        // Update ticket count (decrement by 1)
        const updateQuery = `
          UPDATE events 
          SET tickets = tickets - 1 
          WHERE id = ? AND tickets > 0
        `;
        
        db.run(updateQuery, [eventId], function(err) {
          if (err) {
            db.run('ROLLBACK');
            db.close();
            reject(err);
            return;
          }
          
          // Check if update was successful
          if (this.changes === 0) {
            db.run('ROLLBACK');
            db.close();
            reject(new Error('Ticket purchase failed - tickets may have sold out'));
            return;
          }
          
          // Commit transaction
          db.run('COMMIT', (err) => {
            if (err) {
              db.run('ROLLBACK');
              db.close();
              reject(err);
              return;
            }
            
            // Return updated event data
            const updatedEvent = {
              id: event.id,
              name: event.name,
              date: event.date,
              tickets: event.tickets - 1
            };
            
            db.close();
            resolve(updatedEvent);
          });
        });
      });
    });
  });
}

module.exports = {
  getAllEvents,
  getEventById,
  purchaseTicket
};

/**
 * Purchase a ticket for an event
 * Purpose: Decrement ticket count to prevent overselling
 * 
 * @param {number} eventId - Event ID
 * @returns {Promise<Object>} Updated event or error
 */
function purchaseTicket(eventId) {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(DB_PATH);
    
    // Begin transaction for atomic update
    db.serialize(() => {
      db.run('BEGIN TRANSACTION');
      
      // First, check current ticket count with row-level lock
      const checkQuery = 'SELECT id, name, date, tickets FROM events WHERE id = ?';
      
      db.get(checkQuery, [eventId], (err, event) => {
        if (err) {
          db.run('ROLLBACK');
          db.close();
          reject(err);
          return;
        }
        
        // Event not found
        if (!event) {
          db.run('ROLLBACK');
          db.close();
          reject(new Error('Event not found'));
          return;
        }
        
        // No tickets available
        if (event.tickets <= 0) {
          db.run('ROLLBACK');
          db.close();
          reject(new Error('No tickets available'));
          return;
        }
        
        // Update ticket count (decrement by 1)
        const updateQuery = `
          UPDATE events 
          SET tickets = tickets - 1 
          WHERE id = ? AND tickets > 0
        `;
        
        db.run(updateQuery, [eventId], function(err) {
          if (err) {
            db.run('ROLLBACK');
            db.close();
            reject(err);
            return;
          }
          
          // Check if update was successful
          if (this.changes === 0) {
            db.run('ROLLBACK');
            db.close();
            reject(new Error('Ticket purchase failed - tickets may have sold out'));
            return;
          }
          
          // Commit transaction
          db.run('COMMIT', (err) => {
            if (err) {
              db.run('ROLLBACK');
              db.close();
              reject(err);
              return;
            }
            
            // Return updated event data
            const updatedEvent = {
              id: event.id,
              name: event.name,
              date: event.date,
              tickets: event.tickets - 1
            };
            
            db.close();
            resolve(updatedEvent);
          });
        });
      });
    });
  });
}

module.exports = {
  getAllEvents,
  getEventById,
  purchaseTicket
};