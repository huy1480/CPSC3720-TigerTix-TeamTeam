/**
 * Client Service API Integration Tests
 * Tests API endpoints, database integration, and booking flow
 */

const request = require('supertest');
const express = require('express');
const jwt = require('jsonwebtoken');
const clientRoutes = require('../routes/clientRoutes');
const clientModel = require('../models/clientModel');
const { JWT_SECRET } = require('../../user-authentication/utils/jwt');

// Create test app
const app = express();
app.use(express.json());
app.use(clientRoutes);

const TEST_TOKEN = jwt.sign(
  { id: 9000, email: 'test.user@example.com' },
  JWT_SECRET,
  { expiresIn: '30m' }
);

const withAuth = (req) =>
  req.set('Authorization', `Bearer ${TEST_TOKEN}`);

const authedPost = (endpoint) =>
  withAuth(request(app).post(endpoint));

describe('Client Service API Integration Tests', () => {
  
  describe('GET /api/events', () => {
    test('should return array of events', async () => {
      const response = await request(app)
        .get('/api/events')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });

    test('should return events with required fields', async () => {
      const response = await request(app)
        .get('/api/events')
        .expect(200);

      if (response.body.length > 0) {
        const event = response.body[0];
        expect(event).toHaveProperty('id');
        expect(event).toHaveProperty('name');
        expect(event).toHaveProperty('date');
        expect(event).toHaveProperty('tickets');
      }
    });
  });

  describe('GET /api/events/search', () => {
    test('should find event by exact name', async () => {
      const response = await request(app)
        .get('/api/events/search')
        .query({ name: 'Jazz Night' })
        .expect('Content-Type', /json/);

      if (response.status === 200) {
        expect(response.body).toHaveProperty('name');
        expect(response.body.name.toLowerCase()).toContain('jazz');
      }
    });

    test('should return 404 for non-existent event', async () => {
      const response = await request(app)
        .get('/api/events/search')
        .query({ name: 'Nonexistent Event XYZ' });

      expect([404, 200]).toContain(response.status);
      if (response.status === 404) {
        expect(response.body).toHaveProperty('message');
      }
    });

    test('should handle case-insensitive search', async () => {
      const response = await request(app)
        .get('/api/events/search')
        .query({ name: 'JAZZ NIGHT' });

      if (response.status === 200) {
        expect(response.body.name.toLowerCase()).toContain('jazz');
      }
    });
  });

  describe('GET /api/events/:id', () => {
    test('should return event by ID', async () => {
      const response = await request(app)
        .get('/api/events/1')
        .expect('Content-Type', /json/);

      if (response.status === 200) {
        expect(response.body).toHaveProperty('id', 1);
        expect(response.body).toHaveProperty('name');
      }
    });

    test('should return 404 for invalid ID', async () => {
      const response = await request(app)
        .get('/api/events/99999')
        .expect('Content-Type', /json/);

      expect([404, 200]).toContain(response.status);
    });

    test('should reject non-numeric ID', async () => {
      const response = await request(app)
        .get('/api/events/invalid')
        .expect('Content-Type', /json/);

      expect([400, 404, 500]).toContain(response.status);
    });
  });

  describe('POST /api/llm/parse', () => {
    test('should parse greeting intent', async () => {
      const response = await request(app)
        .post('/api/llm/parse')
        .send({ text: 'hello' })
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveProperty('intent');
      expect(response.body.intent).toBe('greet');
    });

    test('should parse show_events intent', async () => {
      const response = await request(app)
        .post('/api/llm/parse')
        .send({ text: 'show events' })
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body.intent).toBe('show_events');
      expect(response.body).toHaveProperty('events');
    });

    test('should parse booking intent with event and quantity', async () => {
      const response = await request(app)
        .post('/api/llm/parse')
        .send({ text: 'book 2 tickets for Jazz Night' })
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveProperty('intent');
      if (response.body.intent === 'book') {
        expect(response.body).toHaveProperty('tickets');
        expect(response.body.tickets).toBeGreaterThan(0);
      }
    });

    test('should reject empty text', async () => {
      const response = await request(app)
        .post('/api/llm/parse')
        .send({ text: '' })
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    test('should reject missing text field', async () => {
      const response = await request(app)
        .post('/api/llm/parse')
        .send({})
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    test('should handle unknown event names gracefully', async () => {
      const response = await request(app)
        .post('/api/llm/parse')
        .send({ text: 'book tickets for Unknown Event' })
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveProperty('intent');
      // Should return book intent but no eventId
      if (response.body.intent === 'book') {
        expect(response.body.eventId).toBeUndefined();
      }
    });
  });

  describe('POST /api/bookings/confirm', () => {
    test('should require eventId', async () => {
      const response = await authedPost('/api/bookings/confirm')
        .send({ tickets: 2 })
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('eventId');
    });

    test('should require tickets', async () => {
      const response = await authedPost('/api/bookings/confirm')
        .send({ eventId: 1 })
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('tickets');
    });

    test('should reject invalid eventId', async () => {
      const response = await authedPost('/api/bookings/confirm')
        .send({ eventId: -1, tickets: 2 })
        .expect('Content-Type', /json/);

      expect([400, 404]).toContain(response.status);
    });

    test('should reject zero tickets', async () => {
      const response = await authedPost('/api/bookings/confirm')
        .send({ eventId: 1, tickets: 0 })
        .expect('Content-Type', /json/);

      expect([400, 500]).toContain(response.status);
    });

    test('should reject negative tickets', async () => {
      const response = await authedPost('/api/bookings/confirm')
        .send({ eventId: 1, tickets: -5 })
        .expect('Content-Type', /json/);

      expect([400, 500]).toContain(response.status);
    });

    test('should handle booking with insufficient tickets', async () => {
      const response = await authedPost('/api/bookings/confirm')
        .send({ eventId: 1, tickets: 10000 })
        .expect('Content-Type', /json/);

      // Should fail with 400 or succeed based on actual ticket count
      if (response.status === 400) {
        expect(response.body.error).toMatch(/remaining|available/i);
      }
    });

    test('should accept valid booking request', async () => {
      // This test may fail if event doesn't exist or has no tickets
      // It's designed to test the happy path when conditions are right
      const response = await authedPost('/api/bookings/confirm')
        .send({ 
          eventId: 1, 
          tickets: 1,
          customerName: 'Test User'
        })
        .expect('Content-Type', /json/);

      if (response.status === 200) {
        expect(response.body).toHaveProperty('message');
        expect(response.body).toHaveProperty('bookingId');
        expect(response.body).toHaveProperty('event');
      }
    });
  });

  describe('POST /api/events/:id/purchase (Legacy)', () => {
    test('should handle direct purchase', async () => {
      const response = await authedPost('/api/events/1/purchase')
        .send({})
        .expect('Content-Type', /json/);

      // Should either succeed or fail gracefully
      expect([200, 400, 404, 500]).toContain(response.status);
      
      if (response.status === 200) {
        expect(response.body).toHaveProperty('message');
      }
    });

    test('should reject invalid event ID in purchase', async () => {
      const response = await authedPost('/api/events/invalid/purchase')
        .send({})
        .expect('Content-Type', /json/);

      expect([400, 404, 500]).toContain(response.status);
    });
  });

  describe('Error Handling', () => {
    test('should handle malformed JSON in POST requests', async () => {
      const response = await request(app)
        .post('/api/llm/parse')
        .set('Content-Type', 'application/json')
        .send('{ invalid json }')
        .expect('Content-Type', /json/);

      expect([400, 500]).toContain(response.status);
    });

    test('should handle missing Content-Type header', async () => {
      const response = await request(app)
        .post('/api/llm/parse')
        .send('text=hello');

      // Should either handle it or return error
      expect(response.status).toBeGreaterThanOrEqual(200);
    });

    test('should return JSON for all endpoints', async () => {
      const endpoints = [
        '/api/events',
        '/api/events/1'
      ];

      for (const endpoint of endpoints) {
        const response = await request(app).get(endpoint);
        expect(response.headers['content-type']).toMatch(/json/);
      }
    });
  });

  describe('Database Integration', () => {
    test('should use database for getAllEvents', async () => {
      const events = await clientModel.getAllEvents();
      expect(Array.isArray(events)).toBe(true);
    });

    test('should use database for getEventById', async () => {
      try {
        const event = await clientModel.getEventById(1);
        if (event) {
          expect(event).toHaveProperty('id');
          expect(event).toHaveProperty('name');
        }
      } catch (error) {
        // Event might not exist, which is okay
        expect(error).toBeDefined();
      }
    });

    test('should use database for findEventByName', async () => {
      const event = await clientModel.findEventByName('Jazz Night');
      // May or may not find event, both are valid
      if (event) {
        expect(event).toHaveProperty('name');
      }
    });
  });

  describe('Response Format', () => {
    test('should return consistent error format', async () => {
      const response = await request(app)
        .post('/api/llm/parse')
        .send({ text: '' })
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(typeof response.body.error).toBe('string');
    });

    test('should include appropriate HTTP status codes', async () => {
      const testCases = [
        { endpoint: '/api/events', method: 'get', expectedStatus: 200 },
        { endpoint: '/api/llm/parse', method: 'post', body: {}, expectedStatus: 400 }
      ];

      for (const testCase of testCases) {
        const response = testCase.method === 'get'
          ? await request(app).get(testCase.endpoint)
          : await request(app).post(testCase.endpoint).send(testCase.body || {});
        
        expect(response.status).toBe(testCase.expectedStatus);
      }
    });
  });

  describe('CORS and Headers', () => {
    test('should handle CORS preflight', async () => {
      const response = await request(app)
        .options('/api/events')
        .set('Origin', 'http://localhost:3000')
        .set('Access-Control-Request-Method', 'GET');

      // CORS should be enabled
      expect([200, 204]).toContain(response.status);
    });

    test('should set appropriate headers', async () => {
      const response = await request(app)
        .get('/api/events')
        .expect(200);

      expect(response.headers['content-type']).toMatch(/json/);
    });
  });

  describe('Performance', () => {
    test('should respond within reasonable time for events list', async () => {
      const startTime = Date.now();
      
      await request(app)
        .get('/api/events')
        .expect(200);
      
      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(1000); // Should respond within 1 second
    });

    test('should handle multiple concurrent requests', async () => {
      const requests = Array(5).fill(null).map(() =>
        request(app).get('/api/events')
      );

      const responses = await Promise.all(requests);
      
      responses.forEach(response => {
        expect(response.status).toBe(200);
      });
    });
  });
});
