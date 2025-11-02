CREATE TABLE IF NOT EXISTS events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  date TEXT NOT NULL,
  tickets INTEGER NOT NULL
);

INSERT INTO events (name, date, tickets) VALUES
('Homecoming Football Game', '2025-10-15', 50),
('Spring Concert', '2025-04-12', 75),
('Hackathon 2025', '2025-11-08', 100);
