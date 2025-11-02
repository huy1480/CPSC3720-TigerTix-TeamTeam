import React, { useCallback, useEffect, useRef, useState } from 'react';
import './App.css';
import microphoneIcon from './microphone.png';
import beepSound from './Beep.mp3';

const createMessage = (role, text) => ({
  id: `${role}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  role,
  text
});

const formatEventListMessage = (eventList = []) => {
  if (!eventList || eventList.length === 0) {
    return 'There are no events available right now.';
  }

  const lines = eventList.map(
    (event) =>
      `- ${event.name} on ${event.date} (${event.tickets} tickets remaining)`
  );

  return ['Here are the current events with available tickets:', ...lines].join(
    '\n'
  );
};

/**
 * TigerTix Main Application Component with Voice-Enabled Interface
 * Displays events and an LLM-assisted booking workflow with voice interaction
 */
function App() {
  const [events, setEvents] = useState([]);
  const [chatMessages, setChatMessages] = useState([
    createMessage(
      'assistant',
      "Hi there! I'm the TigerTix assistant. I can list events and help reserve tickets for you."
    ),
    createMessage(
      'assistant',
      'Try asking me something like "Show the events" or "Book two tickets for the Spring Concert." You can also use the microphone button to speak!'
    )
  ]);
  const [chatInput, setChatInput] = useState('');
  const [assistantBusy, setAssistantBusy] = useState(false);
  const [pendingBooking, setPendingBooking] = useState(null);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [eventsError, setEventsError] = useState('');
  const [bannerMessage, setBannerMessage] = useState('');
  
  // Voice-related state
  const [isRecording, setIsRecording] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [micCountdown, setMicCountdown] = useState(0);
  const [voiceSupported, setVoiceSupported] = useState(false);
  
  const chatContainerRef = useRef(null);
  const micTimerRef = useRef(null);
  const recognitionRef = useRef(null);
  const synthRef = useRef(null);

  const appendMessage = useCallback((role, text) => {
    setChatMessages((prev) => [...prev, createMessage(role, text)]);
  }, []);

  // Text-to-Speech function (defined early so handleVoiceInput can use it)
  const speakText = useCallback((text) => {
    if (!synthRef.current || !voiceSupported) {
      console.warn('Speech synthesis not available');
      return;
    }
    
    // Cancel any ongoing speech
    synthRef.current.cancel();
    
    // Create utterance
    const utterance = new SpeechSynthesisUtterance(text);
    
    // Configure for accessibility
    utterance.rate = 0.9; // Slightly slower for clarity
    utterance.pitch = 1.0;
    utterance.volume = 1.0;
    
    // Try to use a natural-sounding voice
    const voices = synthRef.current.getVoices();
    const preferredVoice = voices.find(voice => 
      voice.lang.startsWith('en') && voice.name.includes('Google')
    ) || voices.find(voice => voice.lang.startsWith('en'));
    
    if (preferredVoice) {
      utterance.voice = preferredVoice;
    }
    
    utterance.onstart = () => {
      setIsSpeaking(true);
    };
    
    utterance.onend = () => {
      setIsSpeaking(false);
    };
    
    utterance.onerror = (event) => {
      console.error('Speech synthesis error:', event);
      setIsSpeaking(false);
    };
    
    synthRef.current.speak(utterance);
  }, [voiceSupported]);

  const handleParseResponse = useCallback((data) => {
    switch (data.intent) {
      case 'show_events': {
        let eventList = events;
        if (Array.isArray(data.events)) {
          setEvents(data.events);
          eventList = data.events;
        }

        const responseText =
          eventList && eventList.length > 0
            ? formatEventListMessage(eventList)
            : data.message || 'No events available at this time.';

        appendMessage('assistant', responseText);
        setPendingBooking(null);
        break;
      }
      case 'greet': {
        appendMessage(
          'assistant',
          data.message ||
            "Hello! I'm ready to help you find events or book tickets."
        );
        break;
      }
      case 'book': {
        if (data.eventId && data.event) {
          const quantity = data.tickets || 1;
          setPendingBooking({
            eventId: data.eventId,
            eventName: data.event.name,
            eventDate: data.event.date,
            tickets: quantity
          });
          appendMessage(
            'assistant',
            data.message ||
              `I can prepare ${quantity} ticket(s) for ${data.event.name}. Please confirm below when you're ready.`
          );
        } else {
          appendMessage(
            'assistant',
            data.message ||
              "I couldn't find that event. Ask me to show events to see what's available."
          );
          setPendingBooking(null);
        }
        break;
      }
      case 'cancel': {
        setPendingBooking(null);
        appendMessage(
          'assistant',
          data.message || 'No problem, I have cancelled that booking request.'
        );
        break;
      }
      case 'confirm': {
        appendMessage(
          'assistant',
          data.message ||
            'Please use the confirm button to finalize your booking.'
        );
        break;
      }
      default: {
        appendMessage(
          'assistant',
          data.message ||
            'I can list events and help you prepare a booking. Try asking to show events or request tickets.'
        );
        break;
      }
    }
  }, [events, appendMessage]);

  // Handle voice input processing (defined before useEffect that uses it)
  const handleVoiceInput = useCallback(async (transcript) => {
    setAssistantBusy(true);

    try {
      const res = await fetch('/api/llm/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: transcript })
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Unable to interpret that request.');
      }

      handleParseResponse(data);
      
      // Speak the assistant's response
      if (data.message) {
        speakText(data.message);
      }
    } catch (error) {
      console.error('Assistant error:', error);
      const errorMsg = 'Sorry, I had trouble with that request. Please try again or ask me to list the events.';
      appendMessage('assistant', errorMsg);
      speakText(errorMsg);
    } finally {
      setAssistantBusy(false);
    }
  }, [speakText, appendMessage, handleParseResponse]);

  // Initialize voice services (only once on mount)
  useEffect(() => {
    // Check for Web Speech API support
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const speechSynthesis = window.speechSynthesis;
    
    if (SpeechRecognition && speechSynthesis) {
      setVoiceSupported(true);
      synthRef.current = speechSynthesis;
    } else {
      console.warn('Web Speech API not supported in this browser');
    }
    
    // Cleanup on unmount only
    return () => {
      if (synthRef.current) {
        synthRef.current.cancel();
      }
    };
  }, []); // Empty dependency array - run once on mount

  // Fetch events dynamically from the client microservice
  useEffect(() => {
    const fetchEvents = async () => {
      setLoadingEvents(true);
      try {
        const res = await fetch('/api/events');
        if (!res.ok) {
          throw new Error('Unable to load events');
        }
        const data = await res.json();
        setEvents(data);
        setEventsError('');
      } catch (error) {
        console.error('Error fetching events:', error);
        setEventsError('Failed to load events. Please try again later.');
        appendMessage(
          'assistant',
          'I had trouble loading the events. Please refresh the page or try again later.'
        );
      } finally {
        setLoadingEvents(false);
      }
    };

    fetchEvents();
  }, [appendMessage]);

  const sendChatMessage = async () => {
    const trimmed = chatInput.trim();
    if (!trimmed || assistantBusy) return;

    appendMessage('user', trimmed);
    setChatInput('');
    setAssistantBusy(true);

    try {
      const res = await fetch('/api/llm/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: trimmed })
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Unable to interpret that request.');
      }

      handleParseResponse(data);
      
      // Optionally speak the response for text input too
      if (data.message) {
        speakText(data.message);
      }
    } catch (error) {
      console.error('Assistant error:', error);
      const errorMsg = 'Sorry, I had trouble with that request. Please try again or ask me to list the events.';
      appendMessage('assistant', errorMsg);
      speakText(errorMsg);
    } finally {
      setAssistantBusy(false);
    }
  };

  useEffect(() => {
    if (!chatContainerRef.current) return;
    const node = chatContainerRef.current;
    node.scrollTo({
      top: node.scrollHeight,
      behavior: 'smooth'
    });
  }, [chatMessages, pendingBooking, assistantBusy]);

  useEffect(() => {
    return () => {
      if (micTimerRef.current) {
        clearInterval(micTimerRef.current);
        micTimerRef.current = null;
      }
    };
  }, []);

  const confirmBooking = async () => {
    if (!pendingBooking || assistantBusy) return;

    setAssistantBusy(true);
    try {
      const res = await fetch('/api/bookings/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventId: pendingBooking.eventId,
          tickets: pendingBooking.tickets,
          customerName: 'Guest'
        })
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Unable to confirm the booking.');
      }

      setEvents((prevEvents) =>
        prevEvents.map((event) =>
          event.id === pendingBooking.eventId
            ? { ...event, tickets: data.remaining }
            : event
        )
      );

      const successMsg = data.message || `All set! Your tickets for ${pendingBooking.eventName} are booked.`;
      appendMessage('assistant', successMsg);
      speakText(successMsg);
    } catch (error) {
      console.error('Confirm booking error:', error);
      const errorMsg = `I could not confirm that booking: ${error.message}.`;
      appendMessage('assistant', errorMsg);
      speakText(errorMsg);
    } finally {
      setPendingBooking(null);
      setAssistantBusy(false);
    }
  };

  const buyTicket = async (event) => {
    try {
      const res = await fetch(`/api/events/${event.id}/purchase`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Unable to purchase a ticket.');
      }

      setEvents((prevEvents) =>
        prevEvents.map((existing) =>
          existing.id === event.id
            ? { ...existing, tickets: data.remaining }
            : existing
        )
      );

      setBannerMessage(
        `Success! Ticket purchased for ${event.name}. ${data.remaining} tickets remaining.`
      );
    } catch (error) {
      console.error('Direct purchase error:', error);
      setBannerMessage(error.message);
    }
  };

  const cancelPendingBooking = () => {
    if (!pendingBooking) return;
    setPendingBooking(null);
    const cancelMsg = 'Okay, I will keep those tickets available.';
    appendMessage('assistant', cancelMsg);
    speakText(cancelMsg);
  };

  const handleMicrophoneClick = () => {
    if (micCountdown > 0 || isRecording || !voiceSupported) return;

    // Play beep sound first
    const audio = new Audio(beepSound);
    audio.play().catch(err => console.error('Beep sound error:', err));

    // Start countdown
    setMicCountdown(3);
    if (micTimerRef.current) {
      clearInterval(micTimerRef.current);
    }

    micTimerRef.current = setInterval(() => {
      setMicCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(micTimerRef.current);
          micTimerRef.current = null;
          
          // Start recording after countdown
          setTimeout(() => {
            startRecording();
          }, 100);
          
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const startRecording = () => {
    if (!voiceSupported) {
      appendMessage('assistant', 'Voice input is not supported in your browser.');
      return;
    }

    if (isRecording) {
      console.log('Already recording, skipping');
      return;
    }

    try {
      // Create a fresh recognition instance each time
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        console.log('Speech recognition started');
        setIsRecording(true);
        appendMessage('assistant', 'Listening... Please speak now.');
      };

      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        console.log('Voice recognized:', transcript);
        
        // Display recognized text in chat
        appendMessage('user', transcript);
        setIsRecording(false);
        
        // Send to LLM for processing
        handleVoiceInput(transcript);
      };

      recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        setIsRecording(false);
        
        if (event.error === 'aborted') {
          // Intentional abort, don't show error
          return;
        }
        
        if (event.error === 'no-speech') {
          appendMessage('assistant', 'No speech was detected. Please try again.');
        } else if (event.error === 'not-allowed') {
          appendMessage('assistant', 'Microphone access was denied. Please enable it in your browser settings.');
        } else if (event.error === 'network') {
          appendMessage('assistant', 'Network error. Please check your connection and try again.');
        } else {
          appendMessage('assistant', 'Sorry, I had trouble with voice recognition. Please try again.');
        }
      };

      recognition.onend = () => {
        console.log('Speech recognition ended');
        setIsRecording(false);
      };

      // Store reference for potential stop
      recognitionRef.current = recognition;
      
      // Start recognition
      recognition.start();
      
    } catch (error) {
      console.error('Error creating recognition:', error);
      setIsRecording(false);
      appendMessage('assistant', 'Could not start voice recognition. Please try again.');
    }
  };

  const stopRecording = () => {
    if (recognitionRef.current && isRecording) {
      try {
        recognitionRef.current.stop();
      } catch (error) {
        console.error('Error stopping recognition:', error);
      }
      setIsRecording(false);
    }
  };

  const stopSpeaking = () => {
    if (synthRef.current) {
      synthRef.current.cancel();
      setIsSpeaking(false);
    }
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    sendChatMessage();
  };

  const renderMessageContent = (text) =>
    text.split('\n').map((line, index, lines) => (
      <span key={`${line}-${index}`}>
        {line}
        {index < lines.length - 1 && <br />}
      </span>
    ));

  return (
    <div className="App">
      {/* Main content area with proper semantic HTML */}
      <main role="main">
        <h1 id="page-title">Clemson Campus Events</h1>
        
        {!voiceSupported && (
          <div className="voice-warning" role="alert">
            Voice features are not supported in your browser. Please use Chrome, Edge, or Safari for voice interaction.
          </div>
        )}
        
        <section className="dashboard-layout" aria-label="Events and booking assistant">
          <div className="events-panel">
            <h2 id="events-heading">Available Events</h2>
            {bannerMessage && (
              <div
                className="message-container"
                role="status"
                aria-live="polite"
              >
                <p className="message">{bannerMessage}</p>
              </div>
            )}

            {/* Loading state with appropriate ARIA */}
            {loadingEvents ? (
              <div role="status" aria-live="polite" className="events-loading">
                <p>Loading events...</p>
              </div>
            ) : eventsError ? (
              <p className="events-error" role="alert">
                {eventsError}
              </p>
            ) : events.length === 0 ? (
              <p>No events available at this time.</p>
            ) : (
              <ul className="events-list" aria-labelledby="events-heading">
                {events.map((event) => (
                  <li key={event.id} className="event-item">
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
                        type="button"
                        className="buy-button"
                        onClick={() => buyTicket(event)}
                        aria-label={`Purchase ticket for ${event.name}. ${event.tickets} tickets available.`}
                        aria-describedby={`tickets-${event.id}`}
                        disabled={event.tickets <= 0}
                      >
                        {event.tickets > 0 ? 'Buy Ticket' : 'Sold Out'}
                      </button>
                    </article>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <section
            className="chat-panel"
            aria-label="TigerTix booking assistant with voice support"
          >
            <div
              className="chat-messages"
              role="log"
              aria-live="polite"
              aria-relevant="additions"
              ref={chatContainerRef}
            >
              {chatMessages.map((msg) => (
                <div key={msg.id} className={`chat-message ${msg.role}`}>
                  <p>{renderMessageContent(msg.text)}</p>
                </div>
              ))}
            </div>

            {assistantBusy && (
              <p className="assistant-status" role="status" aria-live="polite">
                The assistant is thinking...
              </p>
            )}
            
            {isSpeaking && (
              <p className="speaking-status" role="status" aria-live="polite">
                🔊 Speaking...
              </p>
            )}

            {pendingBooking && (
              <div
                className="booking-confirmation"
                role="group"
                aria-label="Confirm booking"
              >
                <p>
                  Ready to book {pendingBooking.tickets} ticket(s) for{' '}
                  <strong>{pendingBooking.eventName}</strong>
                  {pendingBooking.eventDate
                    ? ` on ${pendingBooking.eventDate}`
                    : ''}
                  ?
                </p>
                <div className="booking-actions">
                  <button
                    type="button"
                    onClick={confirmBooking}
                    disabled={assistantBusy}
                  >
                    Confirm Booking
                  </button>
                  <button
                    type="button"
                    onClick={cancelPendingBooking}
                    disabled={assistantBusy}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            <form className="chat-input" onSubmit={handleSubmit}>
              <label htmlFor="chat-text" className="visually-hidden">
                Message the TigerTix assistant
              </label>
              <input
                id="chat-text"
                type="text"
                value={chatInput}
                onChange={(event) => setChatInput(event.target.value)}
                placeholder="Ask about events or request a booking..."
                disabled={assistantBusy || isRecording}
                autoComplete="off"
              />
              <button
                type="button"
                className={`mic-button ${isRecording ? 'recording' : ''} ${!voiceSupported ? 'disabled' : ''}`}
                onClick={isRecording ? stopRecording : handleMicrophoneClick}
                aria-label={
                  isRecording 
                    ? 'Stop recording'
                    : micCountdown > 0
                    ? `Voice input begins in ${micCountdown} second${micCountdown === 1 ? '' : 's'}`
                    : 'Start voice input'
                }
                disabled={assistantBusy || !voiceSupported || micCountdown > 0}
                title={!voiceSupported ? 'Voice not supported in this browser' : ''}
              >
                {micCountdown > 0 ? (
                  <span className="mic-countdown" aria-hidden="true">
                    {micCountdown}
                  </span>
                ) : isRecording ? (
                  <span className="recording-indicator" aria-hidden="true">⏹</span>
                ) : (
                  <img src={microphoneIcon} alt="" aria-hidden="true" />
                )}
              </button>
              {isSpeaking && (
                <button
                  type="button"
                  className="stop-speech-button"
                  onClick={stopSpeaking}
                  aria-label="Stop speaking"
                >
                  🔇
                </button>
              )}
              <button
                type="submit"
                className="send-button"
                disabled={assistantBusy || isRecording}
              >
                Send
              </button>
            </form>
          </section>
        </section>
      </main>
    </div>
  );
}

export default App;
