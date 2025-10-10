const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '../../shared-db/database.sqlite');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) console.error('Error connecting to database:', err.message);
  else console.log('Connected to shared SQLite database.');
});

exports.getAllEvents = () => {
  return new Promise((resolve, reject) => {
    db.all('SELECT * FROM events', [], (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
};

exports.purchaseTicket = (eventId) => {
  return new Promise((resolve, reject) => {
    db.get('SELECT tickets FROM events WHERE id = ?', [eventId], (err, row) => {
      if (err) return reject(err);
      if (!row) return reject({ status: 404, message: 'Event not found' });
      if (row.tickets <= 0) return reject({ status: 400, message: 'Tickets sold out' });

      db.run('UPDATE events SET tickets = tickets - 1 WHERE id = ?', [eventId], function (updateErr) {
        if (updateErr) return reject(updateErr);
        resolve({ message: 'Ticket purchased successfully', remaining: row.tickets - 1 });
      });
    });
  });
};
