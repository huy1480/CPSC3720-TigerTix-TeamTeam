/**
 * Admin Controller Unit Tests
 * Tests event creation, validation, and error handling
 */

const adminController = require('../controllers/adminController');
const adminModel = require('../models/adminModel');

// Mock the admin model
jest.mock('../models/adminModel');

describe('Admin Controller - Event Management', () => {
  let mockRequest;
  let mockResponse;

  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();

    // Setup mock request and response objects
    mockRequest = {
      body: {},
      params: {}
    };

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
  });

  describe('createEvent', () => {
    test('should create event successfully with valid data', async () => {
      // Arrange
      mockRequest.body = {
        name: 'Jazz Night',
        date: '2025-12-01',
        tickets: 50
      };

      const mockCreatedEvent = {
        id: 1,
        name: 'Jazz Night',
        date: '2025-12-01',
        tickets: 50
      };

      adminModel.createEvent.mockResolvedValue(mockCreatedEvent);

      // Act
      await adminController.createEvent(mockRequest, mockResponse);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'Event created successfully',
        event: mockCreatedEvent
      });
      expect(adminModel.createEvent).toHaveBeenCalledWith({
        name: 'Jazz Night',
        date: '2025-12-01',
        tickets: 50
      });
    });

    test('should reject event with empty name', async () => {
      // Arrange
      mockRequest.body = {
        name: '',
        date: '2025-12-01',
        tickets: 50
      };

      // Act
      await adminController.createEvent(mockRequest, mockResponse);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Invalid event data',
          details: expect.arrayContaining([
            expect.stringContaining('Event name is required')
          ])
        })
      );
      expect(adminModel.createEvent).not.toHaveBeenCalled();
    });

    test('should reject event with missing date', async () => {
      // Arrange
      mockRequest.body = {
        name: 'Test Event',
        date: '',
        tickets: 50
      };

      // Act
      await adminController.createEvent(mockRequest, mockResponse);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Invalid event data',
          details: expect.arrayContaining([
            expect.stringContaining('Event date is required')
          ])
        })
      );
    });

    test('should reject event with negative tickets', async () => {
      // Arrange
      mockRequest.body = {
        name: 'Test Event',
        date: '2025-12-01',
        tickets: -10
      };

      // Act
      await adminController.createEvent(mockRequest, mockResponse);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Invalid event data',
          details: expect.arrayContaining([
            expect.stringContaining('Tickets must be a non-negative number')
          ])
        })
      );
    });

    test('should reject event with invalid date format', async () => {
      // Arrange
      mockRequest.body = {
        name: 'Test Event',
        date: 'not-a-date',
        tickets: 50
      };

      // Act
      await adminController.createEvent(mockRequest, mockResponse);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Invalid event data',
          details: expect.arrayContaining([
            expect.stringContaining('Invalid date format')
          ])
        })
      );
    });

    test('should reject empty request body', async () => {
      // Arrange
      mockRequest.body = {};

      // Act
      await adminController.createEvent(mockRequest, mockResponse);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Invalid request',
          message: 'Request body is required'
        })
      );
    });

    test('should handle database errors gracefully', async () => {
      // Arrange
      mockRequest.body = {
        name: 'Test Event',
        date: '2025-12-01',
        tickets: 50
      };

      adminModel.createEvent.mockRejectedValue(new Error('Database connection failed'));

      // Act
      await adminController.createEvent(mockRequest, mockResponse);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Failed to create event',
          message: 'Database connection failed'
        })
      );
    });

    test('should trim whitespace from event name and date', async () => {
      // Arrange
      mockRequest.body = {
        name: '  Jazz Night  ',
        date: '  2025-12-01  ',
        tickets: 50
      };

      const mockCreatedEvent = {
        id: 1,
        name: 'Jazz Night',
        date: '2025-12-01',
        tickets: 50
      };

      adminModel.createEvent.mockResolvedValue(mockCreatedEvent);

      // Act
      await adminController.createEvent(mockRequest, mockResponse);

      // Assert
      expect(adminModel.createEvent).toHaveBeenCalledWith({
        name: 'Jazz Night',
        date: '2025-12-01',
        tickets: 50
      });
    });
  });

  describe('getEvents', () => {
    test('should return all events successfully', async () => {
      // Arrange
      const mockEvents = [
        { id: 1, name: 'Jazz Night', date: '2025-12-01', tickets: 50 },
        { id: 2, name: 'Spring Concert', date: '2025-04-12', tickets: 75 }
      ];

      adminModel.getAllEvents.mockResolvedValue(mockEvents);

      // Act
      await adminController.getEvents(mockRequest, mockResponse);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        events: mockEvents,
        count: 2
      });
    });

    test('should return empty array when no events exist', async () => {
      // Arrange
      adminModel.getAllEvents.mockResolvedValue([]);

      // Act
      await adminController.getEvents(mockRequest, mockResponse);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        events: [],
        count: 0
      });
    });

    test('should handle database errors', async () => {
      // Arrange
      adminModel.getAllEvents.mockRejectedValue(new Error('Database error'));

      // Act
      await adminController.getEvents(mockRequest, mockResponse);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Failed to fetch events'
        })
      );
    });
  });

  describe('updateEvent', () => {
    test('should update event successfully', async () => {
      // Arrange
      mockRequest.params.id = '1';
      mockRequest.body = {
        name: 'Updated Jazz Night',
        date: '2025-12-15',
        tickets: 60
      };

      const mockUpdatedEvent = {
        id: 1,
        name: 'Updated Jazz Night',
        date: '2025-12-15',
        tickets: 60,
        updated: true
      };

      adminModel.updateEvent.mockResolvedValue(mockUpdatedEvent);

      // Act
      await adminController.updateEvent(mockRequest, mockResponse);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'Event updated successfully',
        event: mockUpdatedEvent
      });
    });

    test('should reject invalid event ID', async () => {
      // Arrange
      mockRequest.params.id = 'not-a-number';
      mockRequest.body = {
        name: 'Test Event',
        date: '2025-12-01',
        tickets: 50
      };

      // Act
      await adminController.updateEvent(mockRequest, mockResponse);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Invalid event ID'
      });
    });

    test('should return 404 for non-existent event', async () => {
      // Arrange
      mockRequest.params.id = '999';
      mockRequest.body = {
        name: 'Test Event',
        date: '2025-12-01',
        tickets: 50
      };

      adminModel.updateEvent.mockRejectedValue(new Error('Event not found'));

      // Act
      await adminController.updateEvent(mockRequest, mockResponse);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Event not found'
        })
      );
    });
  });
});
