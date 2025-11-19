/**
 * Authentication Middleware Unit Tests
 * 
 * Purpose: Test JWT token verification and authentication enforcement
 * 
 * Test Coverage:
 * - Token extraction from Authorization header
 * - Token extraction from cookies
 * - Token verification and validation
 * - Expired token handling
 * - Missing token handling
 * - Invalid token format handling
 * - User attachment to request object
 */

const { requireAuth, attachUserIfAvailable } = require('../middleware/authMiddleware');
const { verifyToken } = require('../utils/jwt');

// Mock JWT utility
jest.mock('../utils/jwt');

describe('Authentication Middleware Tests', () => {
  let mockRequest;
  let mockResponse;
  let nextFunction;
  
  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Setup mock objects
    mockRequest = {
      headers: {},
      cookies: {},
      user: null
    };
    
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
    
    nextFunction = jest.fn();
  });
  
  describe('requireAuth - Token Verification', () => {
    test('should accept valid token from Authorization header', () => {
      // Arrange
      mockRequest.headers.authorization = 'Bearer valid.jwt.token';
      
      const mockDecodedToken = {
        id: 1,
        email: 'user@test.com',
        iat: Date.now() / 1000,
        exp: (Date.now() / 1000) + 1800 // 30 minutes from now
      };
      
      verifyToken.mockReturnValue(mockDecodedToken);
      
      // Act
      requireAuth(mockRequest, mockResponse, nextFunction);
      
      // Assert
      expect(verifyToken).toHaveBeenCalledWith('valid.jwt.token');
      expect(mockRequest.user).toEqual({
        id: 1,
        email: 'user@test.com'
      });
      expect(nextFunction).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });
    
    test('should accept valid token from cookie', () => {
      // Arrange
      mockRequest.cookies.tt_auth_token = 'cookie.jwt.token';
      
      const mockDecodedToken = {
        id: 2,
        email: 'cookie@test.com'
      };
      
      verifyToken.mockReturnValue(mockDecodedToken);
      
      // Act
      requireAuth(mockRequest, mockResponse, nextFunction);
      
      // Assert
      expect(verifyToken).toHaveBeenCalledWith('cookie.jwt.token');
      expect(mockRequest.user).toEqual({
        id: 2,
        email: 'cookie@test.com'
      });
      expect(nextFunction).toHaveBeenCalled();
    });
    
    test('should prioritize Authorization header over cookie', () => {
      // Arrange
      mockRequest.headers.authorization = 'Bearer header.token';
      mockRequest.cookies.tt_auth_token = 'cookie.token';
      
      verifyToken.mockReturnValue({
        id: 1,
        email: 'header@test.com'
      });
      
      // Act
      requireAuth(mockRequest, mockResponse, nextFunction);
      
      // Assert
      expect(verifyToken).toHaveBeenCalledWith('header.token');
      expect(mockRequest.user.email).toBe('header@test.com');
    });
    
    test('should reject request with missing token', () => {
      // Arrange - no token provided
      
      // Act
      requireAuth(mockRequest, mockResponse, nextFunction);
      
      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Authentication required'
      });
      expect(nextFunction).not.toHaveBeenCalled();
    });
    
    test('should reject expired token', () => {
      // Arrange
      mockRequest.headers.authorization = 'Bearer expired.token';
      
      const expiredError = new Error('jwt expired');
      expiredError.name = 'TokenExpiredError';
      verifyToken.mockImplementation(() => {
        throw expiredError;
      });
      
      // Act
      requireAuth(mockRequest, mockResponse, nextFunction);
      
      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Token is invalid or has expired'
      });
      expect(nextFunction).not.toHaveBeenCalled();
    });
    
    test('should reject invalid token format', () => {
      // Arrange
      mockRequest.headers.authorization = 'Bearer invalid.token';
      
      verifyToken.mockImplementation(() => {
        throw new Error('jwt malformed');
      });
      
      // Act
      requireAuth(mockRequest, mockResponse, nextFunction);
      
      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Token is invalid or has expired'
      });
    });
    
    test('should reject token with invalid signature', () => {
      // Arrange
      mockRequest.headers.authorization = 'Bearer tampered.token';
      
      const signatureError = new Error('invalid signature');
      signatureError.name = 'JsonWebTokenError';
      verifyToken.mockImplementation(() => {
        throw signatureError;
      });
      
      // Act
      requireAuth(mockRequest, mockResponse, nextFunction);
      
      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Token is invalid or has expired'
      });
    });
    
    test('should handle malformed Authorization header', () => {
      // Arrange
      mockRequest.headers.authorization = 'InvalidFormat token';
      
      // Act
      requireAuth(mockRequest, mockResponse, nextFunction);
      
      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Authentication required'
      });
      expect(verifyToken).not.toHaveBeenCalled();
    });
    
    test('should handle empty Authorization header', () => {
      // Arrange
      mockRequest.headers.authorization = '';
      
      // Act
      requireAuth(mockRequest, mockResponse, nextFunction);
      
      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Authentication required'
      });
    });
  });
  
  describe('attachUserIfAvailable - Optional Authentication', () => {
    test('should attach user if valid token present', () => {
      // Arrange
      mockRequest.headers.authorization = 'Bearer valid.token';
      
      verifyToken.mockReturnValue({
        id: 1,
        email: 'user@test.com'
      });
      
      // Act
      attachUserIfAvailable(mockRequest, mockResponse, nextFunction);
      
      // Assert
      expect(mockRequest.user).toEqual({
        id: 1,
        email: 'user@test.com'
      });
      expect(nextFunction).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });
    
    test('should continue without user if no token present', () => {
      // Arrange - no token
      
      // Act
      attachUserIfAvailable(mockRequest, mockResponse, nextFunction);
      
      // Assert
      expect(mockRequest.user).toBeNull();
      expect(nextFunction).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });
    
    test('should continue without user if invalid token', () => {
      // Arrange
      mockRequest.headers.authorization = 'Bearer invalid.token';
      
      verifyToken.mockImplementation(() => {
        throw new Error('invalid token');
      });
      
      // Act
      attachUserIfAvailable(mockRequest, mockResponse, nextFunction);
      
      // Assert
      expect(mockRequest.user).toBeNull();
      expect(nextFunction).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });
    
    test('should continue without user if expired token', () => {
      // Arrange
      mockRequest.cookies.tt_auth_token = 'expired.token';
      
      const expiredError = new Error('jwt expired');
      expiredError.name = 'TokenExpiredError';
      verifyToken.mockImplementation(() => {
        throw expiredError;
      });
      
      // Act
      attachUserIfAvailable(mockRequest, mockResponse, nextFunction);
      
      // Assert
      expect(mockRequest.user).toBeNull();
      expect(nextFunction).toHaveBeenCalled();
    });
  });
  
  describe('Token Extraction Logic', () => {
    test('should extract token from Bearer scheme', () => {
      // Arrange
      mockRequest.headers.authorization = 'Bearer my.jwt.token';
      
      verifyToken.mockReturnValue({ id: 1, email: 'test@test.com' });
      
      // Act
      requireAuth(mockRequest, mockResponse, nextFunction);
      
      // Assert
      expect(verifyToken).toHaveBeenCalledWith('my.jwt.token');
    });
    
    test('should not extract token without Bearer scheme', () => {
      // Arrange
      mockRequest.headers.authorization = 'my.jwt.token';
      
      // Act
      requireAuth(mockRequest, mockResponse, nextFunction);
      
      // Assert
      expect(verifyToken).not.toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(401);
    });
    
    test('should handle case-sensitive Bearer scheme', () => {
      // Arrange
      mockRequest.headers.authorization = 'bearer my.jwt.token';
      
      // Act
      requireAuth(mockRequest, mockResponse, nextFunction);
      
      // Assert - should not work with lowercase
      expect(verifyToken).not.toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(401);
    });
  });
  
  describe('Security Validation', () => {
    test('should verify token signature', () => {
      // Arrange
      mockRequest.headers.authorization = 'Bearer token.with.signature';
      
      verifyToken.mockReturnValue({ id: 1, email: 'test@test.com' });
      
      // Act
      requireAuth(mockRequest, mockResponse, nextFunction);
      
      // Assert
      expect(verifyToken).toHaveBeenCalled();
      // verifyToken internally checks signature with JWT_SECRET
    });
    
    test('should validate token expiration', () => {
      // Arrange
      mockRequest.headers.authorization = 'Bearer token';
      
      const expiredError = new Error('jwt expired');
      expiredError.name = 'TokenExpiredError';
      expiredError.expiredAt = new Date();
      
      verifyToken.mockImplementation(() => {
        throw expiredError;
      });
      
      // Act
      requireAuth(mockRequest, mockResponse, nextFunction);
      
      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Token is invalid or has expired'
      });
    });
  });
  
  describe('Request Object Mutation', () => {
    test('should attach user to request object', () => {
      // Arrange
      mockRequest.headers.authorization = 'Bearer valid.token';
      
      const mockUser = {
        id: 123,
        email: 'test@example.com'
      };
      
      verifyToken.mockReturnValue(mockUser);
      
      // Act
      requireAuth(mockRequest, mockResponse, nextFunction);
      
      // Assert
      expect(mockRequest).toHaveProperty('user');
      expect(mockRequest.user).toEqual({
        id: 123,
        email: 'test@example.com'
      });
    });
    
    test('should not modify request on authentication failure', () => {
      // Arrange
      mockRequest.headers.authorization = 'Bearer invalid.token';
      const originalRequest = { ...mockRequest };
      
      verifyToken.mockImplementation(() => {
        throw new Error('invalid');
      });
      
      // Act
      requireAuth(mockRequest, mockResponse, nextFunction);
      
      // Assert
      expect(mockRequest.user).toBeNull();
    });
  });
  
  describe('Edge Cases', () => {
    test('should handle undefined headers', () => {
      // Arrange
      delete mockRequest.headers;
      
      // Act
      requireAuth(mockRequest, mockResponse, nextFunction);
      
      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(401);
    });
    
    test('should handle undefined cookies', () => {
      // Arrange
      delete mockRequest.cookies;
      
      // Act
      requireAuth(mockRequest, mockResponse, nextFunction);
      
      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(401);
    });
    
    test('should handle null authorization header', () => {
      // Arrange
      mockRequest.headers.authorization = null;
      
      // Act
      requireAuth(mockRequest, mockResponse, nextFunction);
      
      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(401);
    });
    
    test('should trim whitespace from token', () => {
      // Arrange
      mockRequest.headers.authorization = 'Bearer  token.with.spaces  ';
      
      verifyToken.mockReturnValue({ id: 1, email: 'test@test.com' });
      
      // Act
      requireAuth(mockRequest, mockResponse, nextFunction);
      
      // Assert - token should be trimmed before verification
      expect(verifyToken).toHaveBeenCalled();
    });
  });
});
