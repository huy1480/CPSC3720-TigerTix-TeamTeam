import React, { useEffect, useState } from 'react';
import './App.css';

/**
 * TigerTix Main Application Component
 * Displays campus events with accessible ticket purchasing interface
 */
function App() {
  const [events, setEvents] = useState([]);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);

  // Fetch events dynamically from the client microservice
  useEffect(() => {
    setLoading(true);
    fetch('http://localhost:6001/api/events')
      .then((res) => res.json())
      .then((data) => {
        setEvents(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Error fetching events:', err);
        setMessage('Failed to load events. Please try again later.');
        setLoading(false);
      });
  }, []);

  /**
   * Handle ticket purchase
   * @param {number} eventId - ID of the event
   * @param {string} eventName - Name of the event for confirmation message
   */
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
        setMessage(`Success! Ticket purchased for ${eventName}. ${data.remaining} tickets remaining.`);
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
      {/* Main content area with proper semantic HTML */}
      <main role="main">
        <h1 id="page-title">Clemson Campus Events</h1>
        
        {/* Screen reader announcement area for dynamic messages */}
        <div 
          role="status" 
          aria-live="polite" 
          aria-atomic="true"
          className="message-container"
        >
          {message && <p className="message">{message}</p>}
        </div>

        {/* Loading state with appropriate ARIA */}
        {loading ? (
          <div role="status" aria-live="polite">
            <p>Loading events...</p>
          </div>
        ) : (
          <section aria-labelledby="events-heading">
            <h2 id="events-heading" className="visually-hidden">Available Events List</h2>
            
            {events.length === 0 ? (
              <p>No events available at this time.</p>
            ) : (
              <ul className="events-list" role="list">
                {events.map((event) => (
                  <li key={event.id} className="event-item" role="listitem">
                    <article aria-labelledby={`event-name-${event.id}`}>
                      <h3 id={`event-name-${event.id}`} className="event-name">
                        {event.name}
                      </h3>
                      
                      <div className="event-details">
                        <p className="event-date">
                          <span className="label">Date:</span>{' '}
                          <time dateTime={event.date}>{event.date}</time>
                        </p>
                        
                        <p 
                          className="event-tickets"
                          id={`tickets-${event.id}`}
                          aria-label={`${event.tickets} tickets available for ${event.name}`}
                        >
                          <span className="label">Tickets Available:</span>{' '}
                          <span className="ticket-count">{event.tickets}</span>
                        </p>
                      </div>
                      
                      <button 
                        onClick={() => buyTicket(event.id, event.name)}
                        aria-label={`Purchase ticket for ${event.name}. ${event.tickets} tickets available.`}
                        aria-describedby={`tickets-${event.id}`}
                        disabled={event.tickets <= 0}
                        className="buy-button"
                      >
                        {event.tickets > 0 ? 'Buy Ticket' : 'Sold Out'}
                      </button>
                    </article>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}
      </main>
    </div>
  );
}

export default App;