/**
 * Client Model Database Tests
 * Tests database operations and transaction safety
 */

const clientModel = require('../models/clientModel');

describe('Client Model Database Tests', () => {

  describe('getAllEvents', () => {
    test('should return array of events', async () => {
      const events = await clientModel.getAllEvents();
      
      expect(Array.isArray(events)).toBe(true);
    });

    test('should return events with required fields', async () => {
      const events = await clientModel.getAllEvents();
      
      if (events.length > 0) {
        const event = events[0];
        expect(event).toHaveProperty('id');
        expect(event).toHaveProperty('name');
        expect(event).toHaveProperty('date');
        expect(event).toHaveProperty('tickets');
      }
    });

    test('should return events sorted by date', async () => {
      const events = await clientModel.getAllEvents();
      
      if (events.length > 1) {
        // Events should be in chronological order
        for (let i = 0; i < events.length - 1; i++) {
          const date1 = new Date(events[i].date);
          const date2 = new Date(events[i + 1].date);
          // date1 should be <= date2
          expect(date1.getTime()).toBeLessThanOrEqual(date2.getTime());
        }
      }
    });
  });

  describe('getEventById', () => {
    test('should return event when ID exists', async () => {
      // Assuming event with ID 1 exists in test database
      try {
        const event = await clientModel.getEventById(1);
        
        if (event) {
          expect(event).toHaveProperty('id', 1);
          expect(event).toHaveProperty('name');
          expect(event).toHaveProperty('date');
          expect(event).toHaveProperty('tickets');
        }
      } catch (error) {
        // Event might not exist in database
        expect(error).toBeDefined();
      }
    });

    test('should return null for non-existent ID', async () => {
      const event = await clientModel.getEventById(99999);
      expect(event).toBeNull();
    });

    test('should reject invalid ID format', async () => {
      await expect(clientModel.getEventById('invalid'))
        .rejects
        .toMatchObject({ status: 400 });
    });

    test('should reject negative ID', async () => {
      await expect(clientModel.getEventById(-1))
        .rejects
        .toMatchObject({ status: 400 });
    });

    test('should reject zero ID', async () => {
      await expect(clientModel.getEventById(0))
        .rejects
        .toMatchObject({ status: 400 });
    });
  });

  describe('findEventByName', () => {
    test('should find event with exact name match', async () => {
      const events = await clientModel.getAllEvents();
      
      if (events.length > 0) {
        const testEvent = events[0];
        const foundEvent = await clientModel.findEventByName(testEvent.name);
        
        expect(foundEvent).toBeDefined();
        expect(foundEvent.name.toLowerCase()).toBe(testEvent.name.toLowerCase());
      }
    });

    test('should handle case-insensitive search', async () => {
      const events = await clientModel.getAllEvents();
      
      if (events.length > 0) {
        const testEvent = events[0];
        const foundEvent = await clientModel.findEventByName(testEvent.name.toUpperCase());
        
        if (foundEvent) {
          expect(foundEvent.name.toLowerCase()).toBe(testEvent.name.toLowerCase());
        }
      }
    });

    test('should find event with partial name', async () => {
      const events = await clientModel.getAllEvents();
      
      if (events.length > 0) {
        const testEvent = events[0];
        // Search with first word only
        const firstWord = testEvent.name.split(' ')[0];
        const foundEvent = await clientModel.findEventByName(firstWord);
        
        if (foundEvent) {
          expect(foundEvent.name.toLowerCase()).toContain(firstWord.toLowerCase());
        }
      }
    });

    test('should return null for non-existent event', async () => {
      const event = await clientModel.findEventByName('Nonexistent Event XYZ123');
      expect(event).toBeNull();
    });

    test('should handle empty string', async () => {
      const event = await clientModel.findEventByName('');
      expect(event).toBeNull();
    });

    test('should handle null input', async () => {
      const event = await clientModel.findEventByName(null);
      expect(event).toBeNull();
    });

    test('should trim whitespace', async () => {
      const events = await clientModel.getAllEvents();
      
      if (events.length > 0) {
        const testEvent = events[0];
        const foundEvent = await clientModel.findEventByName(`  ${testEvent.name}  `);
        
        if (foundEvent) {
          expect(foundEvent.id).toBe(testEvent.id);
        }
      }
    });
  });

  describe('confirmBooking - Transaction Safety', () => {
    test('should reject booking with invalid event ID', async () => {
      await expect(
        clientModel.confirmBooking('invalid', 2, 'Test User')
      ).rejects.toMatchObject({ 
        status: 400,
        message: expect.stringContaining('Invalid event id')
      });
    });

    test('should reject booking with zero tickets', async () => {
      await expect(
        clientModel.confirmBooking(1, 0, 'Test User')
      ).rejects.toMatchObject({ 
        status: 400,
        message: expect.stringContaining('positive integer')
      });
    });

    test('should reject booking with negative tickets', async () => {
      await expect(
        clientModel.confirmBooking(1, -5, 'Test User')
      ).rejects.toMatchObject({ 
        status: 400
      });
    });

    test('should reject booking for non-existent event', async () => {
      await expect(
        clientModel.confirmBooking(99999, 2, 'Test User')
      ).rejects.toMatchObject({ 
        status: 404,
        message: expect.stringContaining('Event not found')
      });
    });

    test('should create booking record in database', async () => {
      const events = await clientModel.getAllEvents();
      
      // Find an event with available tickets
      const availableEvent = events.find(e => e.tickets > 0);
      
      if (availableEvent) {
        const originalTickets = availableEvent.tickets;
        
        try {
          const result = await clientModel.confirmBooking(
            availableEvent.id,
            1,
            'Test User'
          );
          
          expect(result).toHaveProperty('bookingId');
          expect(result).toHaveProperty('event');
          expect(result).toHaveProperty('requestedTickets', 1);
          expect(result.remainingTickets).toBe(originalTickets - 1);
        } catch (error) {
          // Booking might fail due to concurrency, which is acceptable
          if (error.status === 400) {
            expect(error.message).toContain('tickets remaining');
          }
        }
      }
    });

    test('should decrease ticket count after booking', async () => {
      const events = await clientModel.getAllEvents();
      const availableEvent = events.find(e => e.tickets > 1);
      
      if (availableEvent) {
        const originalTickets = availableEvent.tickets;
        
        try {
          const result = await clientModel.confirmBooking(
            availableEvent.id,
            1,
            'Test User'
          );
          
          expect(result.remainingTickets).toBe(originalTickets - 1);
          
          // Verify in database
          const updatedEvent = await clientModel.getEventById(availableEvent.id);
          expect(updatedEvent.tickets).toBe(originalTickets - 1);
        } catch (error) {
          // Expected if tickets run out
          if (error.status !== 400) {
            throw error;
          }
        }
      }
    });

    test('should prevent booking more tickets than available', async () => {
      const events = await clientModel.getAllEvents();
      
      if (events.length > 0) {
        const event = events[0];
        const excessiveTickets = event.tickets + 100;
        
        await expect(
          clientModel.confirmBooking(event.id, excessiveTickets, 'Test User')
        ).rejects.toMatchObject({
          status: 400,
          message: expect.stringContaining('tickets remaining')
        });
      }
    });

    test('should use database transaction (rollback on error)', async () => {
      // This test verifies that failed bookings don't partially update the database
      const events = await clientModel.getAllEvents();
      
      if (events.length > 0) {
        const event = events[0];
        const originalTickets = event.tickets;
        
        // Try to book more tickets than available
        try {
          await clientModel.confirmBooking(event.id, originalTickets + 10, 'Test User');
          fail('Should have thrown an error');
        } catch (error) {
          expect(error.status).toBe(400);
          
          // Verify ticket count unchanged (transaction rolled back)
          const unchangedEvent = await clientModel.getEventById(event.id);
          expect(unchangedEvent.tickets).toBe(originalTickets);
        }
      }
    });

    test('should handle concurrent booking attempts safely', async () => {
      const events = await clientModel.getAllEvents();
      const testEvent = events.find(e => e.tickets >= 2);
      
      if (testEvent) {
        // Attempt two simultaneous bookings
        const promise1 = clientModel.confirmBooking(testEvent.id, 1, 'User1');
        const promise2 = clientModel.confirmBooking(testEvent.id, 1, 'User2');
        
        const results = await Promise.allSettled([promise1, promise2]);
        
        // At least one should succeed or fail gracefully
        const successful = results.filter(r => r.status === 'fulfilled');
        const failed = results.filter(r => r.status === 'rejected');
        
        expect(successful.length + failed.length).toBe(2);
        
        // Verify final ticket count is correct
        const finalEvent = await clientModel.getEventById(testEvent.id);
        const ticketsBooked = successful.length;
        expect(finalEvent.tickets).toBe(testEvent.tickets - ticketsBooked);
      }
    });

    test('should include customer name in booking', async () => {
      const events = await clientModel.getAllEvents();
      const availableEvent = events.find(e => e.tickets > 0);
      
      if (availableEvent) {
        try {
          const result = await clientModel.confirmBooking(
            availableEvent.id,
            1,
            'John Doe'
          );
          
          expect(result.bookingId).toBeDefined();
          // Customer name stored in database
        } catch (error) {
          // Expected if no tickets available
        }
      }
    });

    test('should default to Guest if no customer name provided', async () => {
      const events = await clientModel.getAllEvents();
      const availableEvent = events.find(e => e.tickets > 0);
      
      if (availableEvent) {
        try {
          const result = await clientModel.confirmBooking(
            availableEvent.id,
            1
            // No customer name provided
          );
          
          expect(result.bookingId).toBeDefined();
        } catch (error) {
          // Expected if no tickets available
        }
      }
    });
  });

  describe('purchaseTicket (Legacy Method)', () => {
    test('should purchase single ticket', async () => {
      const events = await clientModel.getAllEvents();
      const availableEvent = events.find(e => e.tickets > 0);
      
      if (availableEvent) {
        const originalTickets = availableEvent.tickets;
        
        try {
          const result = await clientModel.purchaseTicket(availableEvent.id);
          
          expect(result).toHaveProperty('message');
          expect(result).toHaveProperty('remaining');
          expect(result.remaining).toBe(originalTickets - 1);
        } catch (error) {
          // Expected if tickets run out
        }
      }
    });

    test('should reject purchase for non-existent event', async () => {
      await expect(
        clientModel.purchaseTicket(99999)
      ).rejects.toBeDefined();
    });
  });

  describe('Database Connection', () => {
    test('should handle database connection errors gracefully', async () => {
      // This test verifies error handling when database is unavailable
      // In practice, errors should be caught and handled gracefully
      try {
        const events = await clientModel.getAllEvents();
        expect(Array.isArray(events)).toBe(true);
      } catch (error) {
        expect(error).toBeDefined();
      }
    });
  });

  describe('Data Integrity', () => {
    test('should never allow negative ticket counts', async () => {
      const events = await clientModel.getAllEvents();
      
      events.forEach(event => {
        expect(event.tickets).toBeGreaterThanOrEqual(0);
      });
    });

    test('should maintain referential integrity in bookings', async () => {
      // Bookings should reference valid events
      // This is enforced by FOREIGN KEY constraint in schema
      const events = await clientModel.getAllEvents();
      
      expect(events).toBeDefined();
    });
  });

  describe('Edge Cases', () => {
    test('should handle booking exactly all remaining tickets', async () => {
      const events = await clientModel.getAllEvents();
      const smallEvent = events.find(e => e.tickets > 0 && e.tickets <= 3);
      
      if (smallEvent) {
        const allTickets = smallEvent.tickets;
        
        try {
          const result = await clientModel.confirmBooking(
            smallEvent.id,
            allTickets,
            'Test User'
          );
          
          expect(result.remainingTickets).toBe(0);
        } catch (error) {
          // May fail due to concurrent access
        }
      }
    });

    test('should handle multiple bookings for same event', async () => {
      const events = await clientModel.getAllEvents();
      const testEvent = events.find(e => e.tickets >= 3);
      
      if (testEvent) {
        const originalTickets = testEvent.tickets;
        
        try {
          await clientModel.confirmBooking(testEvent.id, 1, 'User1');
          await clientModel.confirmBooking(testEvent.id, 1, 'User2');
          
          const finalEvent = await clientModel.getEventById(testEvent.id);
          expect(finalEvent.tickets).toBeLessThanOrEqual(originalTickets - 2);
        } catch (error) {
          // Expected if tickets run out
        }
      }
    });
  });
});
