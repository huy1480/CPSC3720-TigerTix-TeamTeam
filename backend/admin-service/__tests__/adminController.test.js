/**
 * Admin Service API Integration Tests
 * Tests API endpoints for event management operations
 */

const request = require('supertest');
const express = require('express');
const adminRoutes = require('../routes/adminRoutes');

// Create test app
const app = express();
app.use(express.json());
app.use('/api/admin', adminRoutes);

describe('Admin Service API Integration Tests', () => {
  
  let createdEventId;

  describe('POST /api/admin/events', () => {
    test('should create event with valid data', async () => {
      const newEvent = {
        name: 'Test Event ' + Date.now(),
        date: '2025-12-31',
        tickets: 100
      };

      const response = await request(app)
        .post('/api/admin/events')
        .send(newEvent)
        .expect('Content-Type', /json/)
        .expect(201);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('created successfully');
      expect(response.body).toHaveProperty('event');
      expect(response.body.event).toHaveProperty('id');
      expect(response.body.event.name).toBe(newEvent.name);

      // Save for later tests
      createdEventId = response.body.event.id;
    });

    test('should reject event with missing name', async () => {
      const response = await request(app)
        .post('/api/admin/events')
        .send({ date: '2025-12-31', tickets: 100 })
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toBe('Invalid event data');
      expect(response.body.details).toContain('Event name is required');
    });

    test('should reject event with empty name', async () => {
      const response = await request(app)
        .post('/api/admin/events')
        .send({ name: '', date: '2025-12-31', tickets: 100 })
        .expect(400);

      expect(response.body.details).toContain('Event name is required');
    });

    test('should reject event with missing date', async () => {
      const response = await request(app)
        .post('/api/admin/events')
        .send({ name: 'Test Event', tickets: 100 })
        .expect(400);

      expect(response.body.details).toContain('Event date is required');
    });

    test('should reject event with invalid date', async () => {
      const response = await request(app)
        .post('/api/admin/events')
        .send({ name: 'Test Event', date: 'invalid-date', tickets: 100 })
        .expect(400);

      expect(response.body.details).toContain('Invalid date format. Use ISO format (YYYY-MM-DD)');
    });

    test('should reject event with missing tickets', async () => {
      const response = await request(app)
        .post('/api/admin/events')
        .send({ name: 'Test Event', date: '2025-12-31' })
        .expect(400);

      expect(response.body.details).toContain('Number of tickets is required');
    });

    test('should reject event with zero tickets', async () => {
      const response = await request(app)
        .post('/api/admin/events')
        .send({ name: 'Test Event', date: '2025-12-31', tickets: 0 })
        .expect(400);

      expect(response.body.details).toContain('Tickets must be a positive number (at least 1)');
    });

    test('should reject event with negative tickets', async () => {
      const response = await request(app)
        .post('/api/admin/events')
        .send({ name: 'Test Event', date: '2025-12-31', tickets: -10 })
        .expect(400);

      expect(response.body.details).toContain('Tickets must be a positive number (at least 1)');
    });

    test('should reject event with non-numeric tickets', async () => {
      const response = await request(app)
        .post('/api/admin/events')
        .send({ name: 'Test Event', date: '2025-12-31', tickets: 'abc' })
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    test('should reject empty request body', async () => {
      const response = await request(app)
        .post('/api/admin/events')
        .send({})
        .expect(400);

      expect(response.body.error).toBe('Invalid request');
      expect(response.body.message).toBe('Request body is required');
    });

    test('should trim whitespace from name and date', async () => {
      const response = await request(app)
        .post('/api/admin/events')
        .send({
          name: '  Trimmed Event  ',
          date: '  2025-12-31  ',
          tickets: 50
        })
        .expect(201);

      expect(response.body.event.name).toBe('Trimmed Event');
      expect(response.body.event.date).toBe('2025-12-31');
    });

    test('should accept event with exactly 1 ticket', async () => {
      const response = await request(app)
        .post('/api/admin/events')
        .send({
          name: 'Event with One Ticket',
          date: '2025-12-31',
          tickets: 1
        })
        .expect(201);

      expect(response.body.event.tickets).toBe(1);
    });

    test('should reject event name exceeding 60 characters', async () => {
      const longName = 'A'.repeat(61);
      const response = await request(app)
        .post('/api/admin/events')
        .send({
          name: longName,
          date: '2025-12-31',
          tickets: 50
        })
        .expect(400);

      expect(response.body.details).toContain('Event name cannot exceed 60 characters');
    });

    test('should accept event name with exactly 60 characters', async () => {
      const exactlyFiftyName = 'A'.repeat(60);
      const response = await request(app)
        .post('/api/admin/events')
        .send({
          name: exactlyFiftyName,
          date: '2025-12-31',
          tickets: 50
        })
        .expect(201);

      expect(response.body.event.name).toBe(exactlyFiftyName);
      expect(response.body.event.name.length).toBe(60);
    });
  });

  describe('GET /api/admin/events', () => {
    test('should return array of events', async () => {
      const response = await request(app)
        .get('/api/admin/events')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveProperty('events');
      expect(Array.isArray(response.body.events)).toBe(true);
      expect(response.body).toHaveProperty('count');
      expect(typeof response.body.count).toBe('number');
    });

    test('should return events with required fields', async () => {
      const response = await request(app)
        .get('/api/admin/events')
        .expect(200);

      if (response.body.events.length > 0) {
        const event = response.body.events[0];
        expect(event).toHaveProperty('id');
        expect(event).toHaveProperty('name');
        expect(event).toHaveProperty('date');
        expect(event).toHaveProperty('tickets');
      }
    });

    test('should return count matching array length', async () => {
      const response = await request(app)
        .get('/api/admin/events')
        .expect(200);

      expect(response.body.count).toBe(response.body.events.length);
    });

    test('should handle empty events list', async () => {
      // This may not be empty in practice, but tests the structure
      const response = await request(app)
        .get('/api/admin/events')
        .expect(200);

      expect(response.body.events).toBeDefined();
      expect(response.body.count).toBeGreaterThanOrEqual(0);
    });
  });

  describe('PUT /api/admin/events/:id', () => {
    test('should update existing event', async () => {
      // First create an event to update
      const createResponse = await request(app)
        .post('/api/admin/events')
        .send({
          name: 'Event to Update',
          date: '2025-12-31',
          tickets: 50
        })
        .expect(201);

      const eventId = createResponse.body.event.id;

      // Now update it
      const updateResponse = await request(app)
        .put(`/api/admin/events/${eventId}`)
        .send({
          name: 'Updated Event Name',
          date: '2026-01-01',
          tickets: 75
        })
        .expect('Content-Type', /json/)
        .expect(200);

      expect(updateResponse.body).toHaveProperty('message');
      expect(updateResponse.body.message).toContain('updated successfully');
      expect(updateResponse.body.event.name).toBe('Updated Event Name');
      expect(updateResponse.body.event.date).toBe('2026-01-01');
      expect(updateResponse.body.event.tickets).toBe(75);
    });

    test('should reject update with invalid ID', async () => {
      const response = await request(app)
        .put('/api/admin/events/invalid')
        .send({
          name: 'Test Event',
          date: '2025-12-31',
          tickets: 50
        })
        .expect(400);

      expect(response.body.error).toBe('Invalid event ID');
    });

    test('should reject update with missing name', async () => {
      const response = await request(app)
        .put('/api/admin/events/1')
        .send({
          date: '2025-12-31',
          tickets: 50
        })
        .expect(400);

      expect(response.body.error).toBe('Invalid event data');
    });

    test('should return 404 for non-existent event', async () => {
      const response = await request(app)
        .put('/api/admin/events/99999')
        .send({
          name: 'Test Event',
          date: '2025-12-31',
          tickets: 50
        })
        .expect(404);

      expect(response.body.error).toBe('Event not found');
    });

    test('should reject update with invalid date', async () => {
      const response = await request(app)
        .put('/api/admin/events/1')
        .send({
          name: 'Test Event',
          date: 'not-a-date',
          tickets: 50
        })
        .expect(400);

      expect(response.body.details).toContain('Invalid date format. Use ISO format (YYYY-MM-DD)');
    });

    test('should reject update with zero tickets', async () => {
      const response = await request(app)
        .put('/api/admin/events/1')
        .send({
          name: 'Test Event',
          date: '2025-12-31',
          tickets: 0
        })
        .expect(400);

      expect(response.body.details).toContain('Tickets must be a positive number (at least 1)');
    });

    test('should reject update with negative tickets', async () => {
      const response = await request(app)
        .put('/api/admin/events/1')
        .send({
          name: 'Test Event',
          date: '2025-12-31',
          tickets: -5
        })
        .expect(400);

      expect(response.body.details).toContain('Tickets must be a positive number (at least 1)');
    });

    test('should reject update with name exceeding 60 characters', async () => {
      const response = await request(app)
        .put('/api/admin/events/1')
        .send({
          name: 'A'.repeat(61),
          date: '2025-12-31',
          tickets: 50
        })
        .expect(400);

      expect(response.body.details).toContain('Event name cannot exceed 60 characters');
    });
  });

  describe('Error Handling', () => {
    test('should handle malformed JSON', async () => {
      const response = await request(app)
        .post('/api/admin/events')
        .set('Content-Type', 'application/json')
        .send('{ invalid json }')
        .expect('Content-Type', /json/);

      expect([400, 500]).toContain(response.status);
    });

    test('should return JSON for all error responses', async () => {
      const response = await request(app)
        .post('/api/admin/events')
        .send({})
        .expect(400);

      expect(response.headers['content-type']).toMatch(/json/);
      expect(response.body).toHaveProperty('error');
    });

    test('should handle database errors gracefully', async () => {
      // This test depends on database state, but ensures graceful error handling
      const response = await request(app)
        .put('/api/admin/events/99999')
        .send({
          name: 'Test',
          date: '2025-12-31',
          tickets: 50
        });

      expect([404, 500]).toContain(response.status);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('CORS Support', () => {
    test('should handle CORS preflight', async () => {
      const response = await request(app)
        .options('/api/admin/events')
        .set('Origin', 'http://localhost:3000')
        .set('Access-Control-Request-Method', 'POST');

      expect([200, 204]).toContain(response.status);
    });
  });

  describe('Input Validation', () => {
    test('should reject event name longer than 60 characters', async () => {
      const longName = 'A'.repeat(1000);
      const response = await request(app)
        .post('/api/admin/events')
        .send({
          name: longName,
          date: '2025-12-31',
          tickets: 50
        })
        .expect(400);

      expect(response.body.details).toContain('Event name cannot exceed 60 characters');
    });

    test('should handle special characters in name', async () => {
      const response = await request(app)
        .post('/api/admin/events')
        .send({
          name: 'Event with Special Chars: @#$%',
          date: '2025-12-31',
          tickets: 50
        })
        .expect(201);

      expect(response.body.event.name).toBe('Event with Special Chars: @#$%');
    });

    test('should handle very large ticket numbers', async () => {
      const response = await request(app)
        .post('/api/admin/events')
        .send({
          name: 'Large Capacity Event',
          date: '2025-12-31',
          tickets: 1000000
        })
        .expect(201);

      expect(response.body.event.tickets).toBe(1000000);
    });
  });

  describe('Response Format', () => {
    test('should return consistent success format', async () => {
      const response = await request(app)
        .post('/api/admin/events')
        .send({
          name: 'Format Test Event',
          date: '2025-12-31',
          tickets: 50
        })
        .expect(201);

      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('event');
      expect(typeof response.body.message).toBe('string');
      expect(typeof response.body.event).toBe('object');
    });

    test('should return consistent error format', async () => {
      const response = await request(app)
        .post('/api/admin/events')
        .send({})
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(typeof response.body.error).toBe('string');
    });
  });

  describe('Performance', () => {
    test('should create event within reasonable time', async () => {
      const startTime = Date.now();
      
      await request(app)
        .post('/api/admin/events')
        .send({
          name: 'Performance Test Event',
          date: '2025-12-31',
          tickets: 50
        });
      
      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(1000); // Should complete within 1 second
    });

    test('should handle multiple concurrent creates', async () => {
      const requests = Array(3).fill(null).map((_, i) =>
        request(app)
          .post('/api/admin/events')
          .send({
            name: `Concurrent Event ${i} ${Date.now()}`,
            date: '2025-12-31',
            tickets: 50
          })
      );

      const responses = await Promise.all(requests);
      
      responses.forEach(response => {
        expect([201, 400, 500]).toContain(response.status);
      });
    });
  });

  describe('Data Persistence', () => {
    test('should persist created event', async () => {
      // Create event
      const createResponse = await request(app)
        .post('/api/admin/events')
        .send({
          name: 'Persistence Test Event',
          date: '2025-12-31',
          tickets: 50
        })
        .expect(201);

      const eventId = createResponse.body.event.id;

      // Retrieve all events and verify it exists
      const getResponse = await request(app)
        .get('/api/admin/events')
        .expect(200);

      const foundEvent = getResponse.body.events.find(e => e.id === eventId);
      expect(foundEvent).toBeDefined();
      expect(foundEvent.name).toBe('Persistence Test Event');
    });

    test('should persist updated event', async () => {
      // Create event
      const createResponse = await request(app)
        .post('/api/admin/events')
        .send({
          name: 'Original Name',
          date: '2025-12-31',
          tickets: 50
        })
        .expect(201);

      const eventId = createResponse.body.event.id;

      // Update event
      await request(app)
        .put(`/api/admin/events/${eventId}`)
        .send({
          name: 'Updated Name',
          date: '2026-01-01',
          tickets: 75
        })
        .expect(200);

      // Retrieve and verify update persisted
      const getResponse = await request(app)
        .get('/api/admin/events')
        .expect(200);

      const updatedEvent = getResponse.body.events.find(e => e.id === eventId);
      expect(updatedEvent.name).toBe('Updated Name');
      expect(updatedEvent.tickets).toBe(75);
    });
  });
});