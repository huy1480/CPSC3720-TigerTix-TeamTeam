const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '../../shared-db/database.sqlite');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Failed to connect to shared database:', err.message);
  } else {
    console.log('User auth service connected to shared SQLite database.');
  }
});

db.serialize(() => {
  db.run(
    `CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )`
  );
});

const normalizeEmail = (email = '') => email.trim().toLowerCase();

exports.createUser = (email, passwordHash) => {
  const normalizedEmail = normalizeEmail(email);

  return new Promise((resolve, reject) => {
    db.run(
      'INSERT INTO users (email, password_hash) VALUES (?, ?)',
      [normalizedEmail, passwordHash],
      function onInsert(err) {
        if (err) {
          return reject(err);
        }

        resolve({
          id: this.lastID,
          email: normalizedEmail
        });
      }
    );
  });
};

exports.findByEmail = (email = '') =>
  new Promise((resolve, reject) => {
    const normalizedEmail = normalizeEmail(email);
    db.get(
      'SELECT id, email, password_hash FROM users WHERE email = ?',
      [normalizedEmail],
      (err, row) => {
        if (err) return reject(err);
        resolve(row || null);
      }
    );
  });

exports.findById = (id) =>
  new Promise((resolve, reject) => {
    db.get(
      'SELECT id, email FROM users WHERE id = ?',
      [id],
      (err, row) => {
        if (err) return reject(err);
        resolve(row || null);
      }
    );
  });
