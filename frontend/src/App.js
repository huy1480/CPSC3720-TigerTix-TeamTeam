/**
 * TigerTix Frontend Application
 * Main React component for event browsing and ticket purchasing
 * Implements accessibility features for visually impaired users
 */

import React, { useState, useEffect } from 'react';
import './App.css';

// API base URL for client service
const API_BASE_URL = 'http://localhost:6001/api';

/**
 * Main App Component
 * Purpose: Display events and handle ticket purchases
 * Accessibility: Full keyboard navigation, ARIA labels, semantic HTML
 */
function App() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [purchaseMessage, setPurchaseMessage] = useState('');

  /**
   * Fetch events from client service on component mount
   * Purpose: Load all available events from the backend
   */
  useEffect(() => {
    fetchEvents();
  }, []);

  /**
   * Fetch all events from the API
   * Purpose: Retrieve event data and update state
   */
  const fetchEvents = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`${API_BASE_URL}/events`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch events');
      }
      
      const data = await response.json();
      setEvents(data.events || []);
      
    } catch (err) {
      console.error('Error fetching events:', err);
      setError('Unable to load events. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handle ticket purchase
   * Purpose: Send purchase request and update UI
   * 
   * @param {number} eventId - ID of the event to purchase ticket for
   * @param {string} eventName - Name of the event (for confirmation message)
   */
  const handlePurchase = async (eventId, eventName) => {
    try {
      const response = await fetch(
        `${API_BASE_URL}/events/${eventId}/purchase`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Purchase failed');
      }
      
      // Update local state with new ticket count
      setEvents(prevEvents =>
        prevEvents.map(event =>
          event.id === eventId
            ? { ...event, tickets: data.event.tickets }
            : event
        )
      );
      
      // Show success message
      const message = `Success! Ticket purchased for ${eventName}`;
      setPurchaseMessage(message);
      
      // Clear message after 5 seconds
      setTimeout(() => {
        setPurchaseMessage('');
      }, 5000);
      
    } catch (err) {
      console.error('Error purchasing ticket:', err);
      const message = `Failed to purchase ticket: ${err.message}`;
      setPurchaseMessage(message);
      
      // Clear error message after 5 seconds
      setTimeout(() => {
        setPurchaseMessage('');
      }, 5000);
    }
  };

  /**
   * Format date string for display
   * Purpose: Convert ISO date to readable format
   * 
   * @param {string} dateString - ISO date string
   * @returns {string} Formatted date
   */
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // Loading state
  if (loading) {
    return (
      <div className="app" role="main">
        <header>
          <h1>TigerTix</h1>
        </header>
        <main>
          <p aria-live="polite">Loading events...</p>
        </main>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="app" role="main">
        <header>
          <h1>TigerTix</h1>
        </header>
        <main>
          <div role="alert" className="error-message">
            {error}
          </div>
          <button onClick={fetchEvents} className="retry-button">
            Retry
          </button>
        </main>
      </div>
    );
  }

  return (
    <div className="app">
      <header>
        <h1>TigerTix - Event Tickets</h1>
        <p>Browse and purchase tickets for upcoming events</p>
      </header>

      <main role="main">
        {/* Success/Error message area with ARIA live region */}
        {purchaseMessage && (
          <div
            role="status"
            aria-live="polite"
            className={
              purchaseMessage.includes('Success')
                ? 'success-message'
                : 'error-message'
            }
          >
            {purchaseMessage}
          </div>
        )}

        {/* Events list */}
        {events.length === 0 ? (
          <p>No events available at this time.</p>
        ) : (
          <section aria-label="Available Events">
            <h2>Available Events</h2>
            <ul className="events-list" role="list">
              {events.map((event) => (
                <li key={event.id} className="event-card" role="listitem">
                  <article aria-labelledby={`event-name-${event.id}`}>
                    <h3 id={`event-name-${event.id}`}>{event.name}</h3>
                    
                    <div className="event-details">
                      <p>
                        <span className="label">Date:</span>{' '}
                        <time dateTime={event.date}>
                          {formatDate(event.date)}
                        </time>
                      </p>
                      
                      <p>
                        <span className="label">Available Tickets:</span>{' '}
                        <span aria-label={`${event.tickets} tickets available`}>
                          {event.tickets}
                        </span>
                      </p>
                    </div>

                    <button
                      onClick={() => handlePurchase(event.id, event.name)}
                      disabled={event.tickets <= 0}
                      className="purchase-button"
                      aria-label={`Purchase ticket for ${event.name}`}
                      aria-disabled={event.tickets <= 0}
                    >
                      {event.tickets > 0 ? 'Buy Ticket' : 'Sold Out'}
                    </button>
                  </article>
                </li>
              ))}
            </ul>
          </section>
        )}
      </main>

      <footer role="contentinfo">
        <p>&copy; 2025 TigerTix. All rights reserved.</p>
      </footer>
    </div>
  );
}

export default App;