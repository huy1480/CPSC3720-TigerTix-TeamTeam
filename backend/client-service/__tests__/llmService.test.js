/**
 * LLM Service Unit Tests
 * Tests natural language parsing, intent recognition, and event matching
 */

const llmService = require('../services/llmService');

// Increase timeout for LLM tests (Ollama can be slow)
jest.setTimeout(60000); // 60 seconds

describe('LLM Service - Natural Language Processing', () => {
  const mockEvents = [
    { id: 1, name: 'Jazz Night', date: '2025-12-01', tickets: 50 },
    { id: 2, name: 'Spring Concert', date: '2025-04-12', tickets: 75 },
    { id: 3, name: 'Hackathon 2025', date: '2025-11-08', tickets: 100 }
  ];

  describe('Intent Recognition', () => {
    test('should recognize greeting intent', async () => {
      const inputs = ['hello', 'hi', 'hey', 'good morning'];
      
      for (const input of inputs) {
        const result = await llmService.parseUserInput(input, mockEvents);
        expect(result.intent).toBe('greet');
      }
    }, 60000); // 60 second timeout

    test('should recognize show_events intent', async () => {
      const inputs = [
        'show events',
        'list events',
        'what events are available',
        'show me all events'
      ];
      
      for (const input of inputs) {
        const result = await llmService.parseUserInput(input, mockEvents);
        expect(result.intent).toBe('show_events');
        expect(result.events).toBeDefined();
        expect(Array.isArray(result.events)).toBe(true);
      }
    }, 60000); // 60 second timeout

    test('should recognize book intent', async () => {
      const inputs = [
        'book tickets for Jazz Night',
        'I want to book Jazz Night',
        'reserve Jazz Night tickets'
      ];
      
      for (const input of inputs) {
        const result = await llmService.parseUserInput(input, mockEvents);
        expect(result.intent).toBe('book');
      }
    }, 60000); // 60 second timeout

    test('should recognize event_details intent', async () => {
      const inputs = [
        'tell me about Jazz Night',
        'what time is Jazz Night',
        'when is Spring Concert',
        'details for Hackathon'
      ];
      
      for (const input of inputs) {
        const result = await llmService.parseUserInput(input, mockEvents);
        expect(['event_details', 'book']).toContain(result.intent);
      }
    }, 60000); // 60 second timeout

    test('should recognize confirm intent', async () => {
      const inputs = ['yes', 'confirm', 'yes please', 'proceed'];
      
      for (const input of inputs) {
        const result = await llmService.parseUserInput(input, mockEvents);
        expect(result.intent).toBe('confirm');
      }
    }, 60000); // 60 second timeout

    test('should recognize cancel intent', async () => {
      const inputs = ['no', 'cancel', 'never mind', 'no thanks'];
      
      for (const input of inputs) {
        const result = await llmService.parseUserInput(input, mockEvents);
        expect(result.intent).toBe('cancel');
      }
    }, 60000); // 60 second timeout
  });

  describe('Event Name Extraction', () => {
    test('should extract exact event name', async () => {
      const result = await llmService.parseUserInput(
        'book tickets for Jazz Night',
        mockEvents
      );
      
      expect(result.eventName).toBe('Jazz Night');
      expect(result.eventId).toBe(1);
      expect(result.event).toMatchObject({
        id: 1,
        name: 'Jazz Night'
      });
    }, 60000); // 60 second timeout

    test('should handle case-insensitive event names', async () => {
      const result = await llmService.parseUserInput(
        'book JAZZ NIGHT',
        mockEvents
      );
      
      expect(result.eventId).toBe(1);
      expect(result.event.name).toBe('Jazz Night');
    }, 60000); // 60 second timeout

    test('should handle partial event name matches', async () => {
      const result = await llmService.parseUserInput(
        'book tickets for Spring',
        mockEvents
      );
      
      // Should match "Spring Concert"
      expect(result.event).toBeDefined();
      expect(result.event.name).toContain('Spring');
    }, 60000); // 60 second timeout

    test('should handle event names with numbers', async () => {
      const result = await llmService.parseUserInput(
        'book Hackathon 2025',
        mockEvents
      );
      
      expect(result.eventId).toBe(3);
      expect(result.event.name).toBe('Hackathon 2025');
    }, 60000); // 60 second timeout

    test('should return null for unknown event names', async () => {
      const result = await llmService.parseUserInput(
        'book tickets for Unknown Event',
        mockEvents
      );
      
      expect(result.event).toBeUndefined();
      expect(result.rawEventName).toBeTruthy();
    }, 60000); // 60 second timeout
  });

  describe('Ticket Quantity Parsing', () => {
    test('should extract numeric ticket quantity', async () => {
      const result = await llmService.parseUserInput(
        'book 3 tickets for Jazz Night',
        mockEvents
      );
      
      expect(result.tickets).toBe(3);
    }, 60000); // 60 second timeout

    test('should extract written number quantities', async () => {
      const testCases = [
        { input: 'book two tickets for Jazz Night', expected: 2 },
        { input: 'book five tickets for Spring Concert', expected: 5 },
        { input: 'book ten tickets for Hackathon', expected: 10 }
      ];
      
      for (const testCase of testCases) {
        const result = await llmService.parseUserInput(testCase.input, mockEvents);
        expect(result.tickets).toBe(testCase.expected);
      }
    }, 60000); // 60 second timeout

    test('should default to 1 ticket when quantity not specified', async () => {
      const result = await llmService.parseUserInput(
        'book Jazz Night',
        mockEvents
      );
      
      expect(result.tickets).toBe(1);
    }, 60000); // 60 second timeout

    test('should handle large quantities', async () => {
      const result = await llmService.parseUserInput(
        'book 25 tickets for Jazz Night',
        mockEvents
      );
      
      expect(result.tickets).toBe(25);
    }, 60000); // 60 second timeout
  });

  describe('Error Handling', () => {
    test('should reject empty input', async () => {
      await expect(
        llmService.parseUserInput('', mockEvents)
      ).rejects.toMatchObject({
        status: 400,
        message: expect.stringContaining('User text required')
      });
    });

    test('should reject null input', async () => {
      await expect(
        llmService.parseUserInput(null, mockEvents)
      ).rejects.toMatchObject({
        status: 400
      });
    });

    test('should handle Ollama service unavailable', async () => {
      // This test assumes Ollama might not be running
      // The service should provide a meaningful error
      try {
        await llmService.parseUserInput('book tickets', []);
      } catch (error) {
        expect(error.status).toBe(503);
        expect(error.message).toContain('Failed to parse request');
      }
    });

    test('should handle empty events list', async () => {
      const result = await llmService.parseUserInput('show events', []);
      
      expect(result.intent).toBe('show_events');
      expect(result.events || []).toHaveLength(0);
    });
  });

  describe('Response Structure', () => {
    test('should return correct structure for show_events', async () => {
      const result = await llmService.parseUserInput('show events', mockEvents);
      
      expect(result).toHaveProperty('intent');
      expect(result).toHaveProperty('source');
      expect(result.intent).toBe('show_events');
      expect(result.events).toBeDefined();
    });

    test('should return correct structure for booking', async () => {
      const result = await llmService.parseUserInput(
        'book 2 tickets for Jazz Night',
        mockEvents
      );
      
      expect(result).toHaveProperty('intent');
      expect(result).toHaveProperty('eventName');
      expect(result).toHaveProperty('eventId');
      expect(result).toHaveProperty('tickets');
      expect(result.intent).toBe('book');
    });

    test('should indicate when confirmation is needed', async () => {
      const result = await llmService.parseUserInput(
        'book Jazz Night',
        mockEvents
      );
      
      if (result.intent === 'book' && result.eventId) {
        expect(result.needsConfirmation).toBeDefined();
      }
    });
  });

  describe('Edge Cases', () => {
    test('should handle very long input gracefully', async () => {
      const longInput = 'I would really like to book some tickets for the amazing Jazz Night event that is happening soon '.repeat(10);
      
      const result = await llmService.parseUserInput(longInput, mockEvents);
      
      expect(result).toHaveProperty('intent');
    }, 60000); // 60 second timeout

    test('should handle special characters in input', async () => {
      const result = await llmService.parseUserInput(
        'book Jazz Night!!!',
        mockEvents
      );
      
      expect(result.intent).toBe('book');
    }, 60000); // 60 second timeout

    test('should handle multiple event names in input', async () => {
      const result = await llmService.parseUserInput(
        'book Jazz Night or Spring Concert',
        mockEvents
      );
      
      expect(result.intent).toBe('book');
      expect(result.event).toBeDefined();
    }, 60000); // 60 second timeout

    test('should handle ambiguous input', async () => {
      const result = await llmService.parseUserInput(
        'what',
        mockEvents
      );
      
      expect(result.intent).toBeDefined();
      // Should not crash, should return some intent
    }, 60000); // 60 second timeout
  });

  describe('Source Attribution', () => {
    test('should indicate ollama as source', async () => {
      const result = await llmService.parseUserInput('hello', mockEvents);
      
      expect(result.source).toBe('ollama');
    });
  });
});
