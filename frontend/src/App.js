import React, { useEffect, useState } from 'react';
import './App.css';

function App() {
  const [events, setEvents] = useState([]);
  const [message, setMessage] = useState('');

  // Fetch events dynamically from the client microservice
  useEffect(() => {
    fetch('http://localhost:6001/api/events') // frontend expects reverse proxy or same-origin setup
      .then((res) => res.json())
      .then((data) => setEvents(data))
      .catch((err) => console.error('Error fetching events:', err));
  }, []);

  // Simulate buying a ticket (calls backend)
  const buyTicket = async (eventId, eventName) => {
    try {
      const res = await fetch(`/api/events/${eventId}/purchase`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json();

      if (res.ok) {
        // Update UI dynamically to reflect ticket count change
        setEvents((prevEvents) =>
          prevEvents.map((ev) =>
            ev.id === eventId ? { ...ev, tickets: data.remaining } : ev
          )
        );
        setMessage(`Ticket purchased successfully for: ${eventName}`);
      } else {
        setMessage(`Error: ${data.error}`);
      }
    } catch (error) {
      console.error('Error purchasing ticket:', error);
      setMessage('An error occurred while processing your purchase.');
    }
  };

  return (
    <div className="App">
      <h1>Clemson Campus Events</h1>
      {message && <p>{message}</p>}
      <ul>
        {events.map((event) => (
          <li key={event.id}>
            {event.name} - {event.date} - Tickets Available: {event.tickets}{' '}
            <button onClick={() => buyTicket(event.id, event.name)}>Buy Ticket</button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default App;
