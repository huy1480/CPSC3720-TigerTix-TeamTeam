/**
 * Database setup
 * Creates necessary tables, runs when
 * admin service starts
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const DB_PATH = path.join(__dirname, '../shared-db/database.sqlite');

/**
 * Initialize database and create tables
 * Ensures database schema exists before service starts
 * and creates events table in shared database
 */
function setupDB() {
    const db = new sqlite3.Database(DB_PATH, (err) => {
        if (err) {
            console.error('Error connecting to database:', err.message);
            return;
        }
        console.log('Connected to shared database');
    })

    // Query to create events table
    const createEventsTable = `
    CREATE TABLE IF NOT EXISTS events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      date TEXT NOT NULL,
      tickets INTEGER NOT NULL DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`;

    // Create table
    db.run(createEventsTable, (err) => {
        if (err) {
            console.error('Error creating events table:', err.message);
        } else {
            console.log('Events table ready');
        }
    });
}

module.exports = setupDatabase();