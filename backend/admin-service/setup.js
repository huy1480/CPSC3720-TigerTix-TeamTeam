/**
 * Database Setup Script
 * Creates tables if they don't exist
 * Runs automatically when admin service starts
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const DB_PATH = path.join(__dirname, '../shared-db/database.sqlite');

/**
 * Initialize database and create tables
 * Purpose: Creates database schema before service starts
 * Creates events table in shared database
 */
function setupDatabase() {
  const db = new sqlite3.Database(DB_PATH, (err) => {
    if (err) {
      console.error('Error connecting to database:', err.message);
      return;
    }
    console.log('Connected to shared SQLite database');
  });

  const createEventsTable = `
    CREATE TABLE IF NOT EXISTS events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      date TEXT NOT NULL,
      tickets INTEGER NOT NULL DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `;

  db.run(createEventsTable, (err) => {
    if (err) {
      console.error('Error creating events table:', err.message);
    } else {
      console.log('Events table ready');
    }
  });

  db.close((err) => {
    if (err) {
      console.error('Error closing database:', err.message);
    }
  });
}

module.exports = setupDatabase;