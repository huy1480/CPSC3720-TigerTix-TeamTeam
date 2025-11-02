/**
 * Frontend App Component Tests
 * Tests UI rendering, user interactions, and accessibility
 */

import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../App';

// Mock fetch API
global.fetch = jest.fn();

// Mock Web Speech API
const mockSpeechRecognition = {
  start: jest.fn(),
  stop: jest.fn(),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn()
};

const mockSpeechSynthesis = {
  speak: jest.fn(),
  cancel: jest.fn(),
  pause: jest.fn(),
  resume: jest.fn(),
  getVoices: jest.fn(() => [])
};

global.SpeechRecognition = jest.fn(() => mockSpeechRecognition);
global.webkitSpeechRecognition = jest.fn(() => mockSpeechRecognition);
global.speechSynthesis = mockSpeechSynthesis;
global.SpeechSynthesisUtterance = jest.fn();

// Mock Audio for beep sound
global.Audio = jest.fn().mockImplementation(() => ({
  play: jest.fn(() => Promise.resolve()),
  pause: jest.fn(),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn()
}));

describe('TigerTix App Component', () => {
  beforeEach(() => {
    fetch.mockClear();
    jest.clearAllMocks();
  });

  describe('Initial Rendering', () => {
    test('renders page title', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => []
      });

      render(<App />);
      
      expect(screen.getByText('Clemson Campus Events')).toBeInTheDocument();
    });

    test('displays assistant initial messages', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => []
      });

      render(<App />);
      
      expect(screen.getByText(/TigerTix assistant/i)).toBeInTheDocument();
    });

    test('shows loading state initially', () => {
      fetch.mockImplementation(() => new Promise(() => {})); // Never resolves

      render(<App />);
      
      expect(screen.getByText(/Loading events/i)).toBeInTheDocument();
    });

    test('has proper semantic structure', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => []
      });

      const { container } = render(<App />);
      
      expect(container.querySelector('main[role="main"]')).toBeInTheDocument();
      expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
    });
  });

  describe('Events Display', () => {
    test('displays events after successful fetch', async () => {
      const mockEvents = [
        { id: 1, name: 'Jazz Night', date: '2025-12-01', tickets: 50 },
        { id: 2, name: 'Spring Concert', date: '2025-04-12', tickets: 75 }
      ];

      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockEvents
      });

      render(<App />);

      await waitFor(() => {
        expect(screen.getByText('Jazz Night')).toBeInTheDocument();
        expect(screen.getByText('Spring Concert')).toBeInTheDocument();
      });
    });

    test('displays ticket counts for each event', async () => {
      const mockEvents = [
        { id: 1, name: 'Jazz Night', date: '2025-12-01', tickets: 50 }
      ];

      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockEvents
      });

      render(<App />);

      await waitFor(() => {
        expect(screen.getByText('50')).toBeInTheDocument();
      });
    });

    test('displays event dates', async () => {
      const mockEvents = [
        { id: 1, name: 'Jazz Night', date: '2025-12-01', tickets: 50 }
      ];

      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockEvents
      });

      render(<App />);

      await waitFor(() => {
        expect(screen.getByText('2025-12-01')).toBeInTheDocument();
      });
    });

    test('shows "Sold Out" for events with no tickets', async () => {
      const mockEvents = [
        { id: 1, name: 'Jazz Night', date: '2025-12-01', tickets: 0 }
      ];

      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockEvents
      });

      render(<App />);

      await waitFor(() => {
        expect(screen.getByText('Sold Out')).toBeInTheDocument();
      });
    });

    test('displays error message when fetch fails', async () => {
      fetch.mockRejectedValueOnce(new Error('Network error'));

      render(<App />);

      await waitFor(() => {
        expect(screen.getByText(/Failed to load events/i)).toBeInTheDocument();
      });
    });
  });

  describe('Chat Interface', () => {
    test('chat input is accessible with proper label', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => []
      });

      render(<App />);
      
      const input = screen.getByLabelText(/Message the TigerTix assistant/i);
      expect(input).toBeInTheDocument();
      expect(input).toHaveAttribute('type', 'text');
    });

    test('can type in chat input', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => []
      });

      render(<App />);
      
      const input = screen.getByLabelText(/Message the TigerTix assistant/i);
      await userEvent.type(input, 'show events');
      
      expect(input).toHaveValue('show events');
    });

    test('send button is present and enabled', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => []
      });

      render(<App />);
      
      const sendButton = screen.getByRole('button', { name: /Send/i });
      expect(sendButton).toBeInTheDocument();
      expect(sendButton).not.toBeDisabled();
    });

    test('microphone button is present', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => []
      });

      render(<App />);
      
      const micButton = screen.getByRole('button', { name: /voice input/i });
      expect(micButton).toBeInTheDocument();
    });

    test('sends message when send button clicked', async () => {
      fetch
        .mockResolvedValueOnce({ ok: true, json: async () => [] })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            intent: 'show_events',
            message: 'Here are the events',
            events: []
          })
        });

      render(<App />);
      
      const input = screen.getByLabelText(/Message the TigerTix assistant/i);
      await userEvent.type(input, 'show events');
      
      const sendButton = screen.getByRole('button', { name: /Send/i });
      await userEvent.click(sendButton);
      
      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith(
          '/api/llm/parse',
          expect.objectContaining({
            method: 'POST',
            body: JSON.stringify({ text: 'show events' })
          })
        );
      });
    });

    test('clears input after sending message', async () => {
      fetch
        .mockResolvedValueOnce({ ok: true, json: async () => [] })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            intent: 'greet',
            message: 'Hello!'
          })
        });

      render(<App />);
      
      const input = screen.getByLabelText(/Message the TigerTix assistant/i);
      await userEvent.type(input, 'hello');
      
      const sendButton = screen.getByRole('button', { name: /Send/i });
      await userEvent.click(sendButton);
      
      await waitFor(() => {
        expect(input).toHaveValue('');
      });
    });

    test('displays user message in chat', async () => {
      fetch
        .mockResolvedValueOnce({ ok: true, json: async () => [] })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            intent: 'greet',
            message: 'Hello!'
          })
        });

      render(<App />);
      
      const input = screen.getByLabelText(/Message the TigerTix assistant/i);
      await userEvent.type(input, 'test message');
      
      const sendButton = screen.getByRole('button', { name: /Send/i });
      await userEvent.click(sendButton);
      
      await waitFor(() => {
        expect(screen.getByText('test message')).toBeInTheDocument();
      });
    });
  });

  describe('Booking Confirmation', () => {
    test('shows confirmation prompt for booking', async () => {
      fetch
        .mockResolvedValueOnce({ ok: true, json: async () => [] })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            intent: 'book',
            eventId: 1,
            eventName: 'Jazz Night',
            eventDate: '2025-12-01',
            tickets: 2,
            needsConfirmation: true,
            message: 'Ready to book'
          })
        });

      render(<App />);
      
      const input = screen.getByLabelText(/Message the TigerTix assistant/i);
      await userEvent.type(input, 'book 2 tickets for Jazz Night');
      
      const sendButton = screen.getByRole('button', { name: /Send/i });
      await userEvent.click(sendButton);
      
      await waitFor(() => {
        expect(screen.getByText(/Ready to book/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Confirm Booking/i })).toBeInTheDocument();
      });
    });

    test('can confirm booking', async () => {
      fetch
        .mockResolvedValueOnce({ ok: true, json: async () => [] })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            intent: 'book',
            eventId: 1,
            eventName: 'Jazz Night',
            eventDate: '2025-12-01',
            tickets: 2,
            needsConfirmation: true
          })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            message: 'Booking confirmed',
            bookingId: 1,
            remaining: 48
          })
        });

      render(<App />);
      
      const input = screen.getByLabelText(/Message the TigerTix assistant/i);
      await userEvent.type(input, 'book Jazz Night');
      await userEvent.click(screen.getByRole('button', { name: /Send/i }));
      
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Confirm Booking/i })).toBeInTheDocument();
      });
      
      const confirmButton = screen.getByRole('button', { name: /Confirm Booking/i });
      await userEvent.click(confirmButton);
      
      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith(
          '/api/bookings/confirm',
          expect.objectContaining({
            method: 'POST'
          })
        );
      });
    });

    test('can cancel booking', async () => {
      fetch
        .mockResolvedValueOnce({ ok: true, json: async () => [] })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            intent: 'book',
            eventId: 1,
            eventName: 'Jazz Night',
            tickets: 2,
            needsConfirmation: true
          })
        });

      render(<App />);
      
      const input = screen.getByLabelText(/Message the TigerTix assistant/i);
      await userEvent.type(input, 'book Jazz Night');
      await userEvent.click(screen.getByRole('button', { name: /Send/i }));
      
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Cancel/i })).toBeInTheDocument();
      });
      
      const cancelButton = screen.getByRole('button', { name: /Cancel/i });
      await userEvent.click(cancelButton);
      
      await waitFor(() => {
        expect(screen.queryByRole('button', { name: /Confirm Booking/i })).not.toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    test('has accessible event list', async () => {
      const mockEvents = [
        { id: 1, name: 'Jazz Night', date: '2025-12-01', tickets: 50 }
      ];

      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockEvents
      });

      render(<App />);

      await waitFor(() => {
        const list = screen.getByRole('list');
        expect(list).toBeInTheDocument();
      });
    });

    test('buy buttons have descriptive labels', async () => {
      const mockEvents = [
        { id: 1, name: 'Jazz Night', date: '2025-12-01', tickets: 50 }
      ];

      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockEvents
      });

      render(<App />);

      await waitFor(() => {
        const buyButton = screen.getByLabelText(/Purchase ticket for Jazz Night/i);
        expect(buyButton).toBeInTheDocument();
      });
    });

    test('chat messages have proper ARIA attributes', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => []
      });

      const { container } = render(<App />);
      
      const chatLog = container.querySelector('[role="log"]');
      expect(chatLog).toBeInTheDocument();
      expect(chatLog).toHaveAttribute('aria-live', 'polite');
    });

    test('displays warning for unsupported voice features', () => {
      // Mock no speech support
      delete global.SpeechRecognition;
      delete global.webkitSpeechRecognition;
      delete global.speechSynthesis;

      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => []
      });

      render(<App />);
      
      expect(screen.getByText(/Voice features are not supported/i)).toBeInTheDocument();
    });
  });

  describe('Direct Ticket Purchase', () => {
    test('can purchase ticket directly from event card', async () => {
      const mockEvents = [
        { id: 1, name: 'Jazz Night', date: '2025-12-01', tickets: 50 }
      ];

      fetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockEvents
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            message: 'Ticket purchased successfully',
            remaining: 49
          })
        });

      render(<App />);

      await waitFor(() => {
        expect(screen.getByText('Jazz Night')).toBeInTheDocument();
      });

      const buyButton = screen.getByRole('button', { name: /Purchase ticket for Jazz Night/i });
      await userEvent.click(buyButton);

      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith(
          '/api/events/1/purchase',
          expect.objectContaining({
            method: 'POST'
          })
        );
      });
    });

    test('updates ticket count after purchase', async () => {
      const mockEvents = [
        { id: 1, name: 'Jazz Night', date: '2025-12-01', tickets: 50 }
      ];

      fetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockEvents
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            message: 'Success',
            remaining: 49
          })
        });

      render(<App />);

      await waitFor(() => {
        expect(screen.getByText('50')).toBeInTheDocument();
      });

      const buyButton = screen.getByRole('button', { name: /Purchase ticket for Jazz Night/i });
      await userEvent.click(buyButton);

      await waitFor(() => {
        expect(screen.getByText('49')).toBeInTheDocument();
      });
    });
  });
});
