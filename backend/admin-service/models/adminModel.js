/**
 * Admin Model
 * Handles all database operations for event management
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const DB_PATH = path.join(__dirname, '../../shared-db/database.sqlite');

/**
 * Create new event 
 * Purpose: Insert event data into the events table
 * 
 * @param {Object} eventData - Event information
 * @param {string} eventData.name - Name of the event
 * @param {string} eventData.date - Date of the event
 * @param {number} eventData.tickets - Number of available tickets
 * @returns {Promise<Object>} Created event with id
 */
function createEvent(eventData) {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(DB_PATH);
    
    const { name, date, tickets } = eventData;
    
    // SQL query to insert new event
    const query = `
      INSERT INTO events (name, date, tickets)
      VALUES (?, ?, ?)
    `;
    
    db.run(query, [name, date, tickets], function(err) {
      if (err) {
        db.close();
        reject(err);
        return;
      }
      
      // Return the created event with its new id
      const createdEvent = {
        id: this.lastID,
        name,
        date,
        tickets
      };
      
      db.close();
      resolve(createdEvent);
    });
  });
}

/**
 * Get all events from database
 * Purpose: Retrieve all events for admin viewing
 * 
 * @returns {Promise<Array>} Array of all events
 */
function getAllEvents() {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(DB_PATH);
    
    const query = 'SELECT * FROM events ORDER BY date ASC';
    
    db.all(query, [], (err, rows) => {
      db.close();
      
      if (err) {
        reject(err);
        return;
      }
      
      resolve(rows);
    });
  });
}

/**
 * Update an existing event
 * Purpose: Modify event details in the database
 * 
 * @param {number} id - Event ID
 * @param {Object} eventData - Updated event information
 * @returns {Promise<Object>} Update result
 */
function updateEvent(id, eventData) {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(DB_PATH);
    
    const { name, date, tickets } = eventData;
    
    const query = `
      UPDATE events
      SET name = ?, date = ?, tickets = ?
      WHERE id = ?
    `;
    
    db.run(query, [name, date, tickets, id], function(err) {
      db.close();
      
      if (err) {
        reject(err);
        return;
      }
      
      if (this.changes === 0) {
        reject(new Error('Event not found'));
        return;
      }
      
      resolve({ id, ...eventData, updated: true });
    });
  });
}

module.exports = {
  createEvent,
  getAllEvents,
  updateEvent
};