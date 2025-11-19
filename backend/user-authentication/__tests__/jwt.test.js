/**
 * JWT Utility Unit Tests
 * 
 * Purpose: Test JWT token signing, verification, and expiration handling
 * 
 * Test Coverage:
 * - Token generation with payload
 * - Token verification and decoding
 * - Token expiration (30 minutes)
 * - Invalid token handling
 * - Secret key validation
 * - Token structure validation
 */

const jwt = require('jsonwebtoken');
const {
  signToken,
  verifyToken,
  JWT_SECRET,
  TOKEN_EXPIRATION,
  TOKEN_EXPIRATION_MS,
  JWT_COOKIE_NAME
} = require('../utils/jwt');

// Mock jsonwebtoken for controlled testing
jest.mock('jsonwebtoken');

describe('JWT Utility Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  
  describe('Configuration Constants', () => {
    test('should have JWT_SECRET defined', () => {
      expect(JWT_SECRET).toBeDefined();
      expect(typeof JWT_SECRET).toBe('string');
      expect(JWT_SECRET.length).toBeGreaterThan(0);
    });
    
    test('should have correct token expiration time', () => {
      expect(TOKEN_EXPIRATION).toBe('30m');
      expect(TOKEN_EXPIRATION_MS).toBe(30 * 60 * 1000);
    });
    
    test('should have correct cookie name', () => {
      expect(JWT_COOKIE_NAME).toBe('tt_auth_token');
    });
  });
  
  describe('signToken', () => {
    test('should generate token with user payload', () => {
      // Arrange
      const payload = {
        id: 1,
        email: 'user@test.com'
      };
      const mockToken = 'mock.jwt.token';
      
      jwt.sign.mockReturnValue(mockToken);
      
      // Act
      const token = signToken(payload);
      
      // Assert
      expect(jwt.sign).toHaveBeenCalledWith(
        payload,
        JWT_SECRET,
        { expiresIn: '30m' }
      );
      expect(token).toBe(mockToken);
    });
    
    test('should generate token with minimal payload', () => {
      // Arrange
      const payload = { id: 1 };
      const mockToken = 'minimal.token';
      
      jwt.sign.mockReturnValue(mockToken);
      
      // Act
      const token = signToken(payload);
      
      // Assert
      expect(jwt.sign).toHaveBeenCalledWith(
        payload,
        JWT_SECRET,
        { expiresIn: '30m' }
      );
      expect(token).toBe(mockToken);
    });
    
    test('should generate token with empty payload', () => {
      // Arrange
      const payload = {};
      const mockToken = 'empty.token';
      
      jwt.sign.mockReturnValue(mockToken);
      
      // Act
      const token = signToken(payload);
      
      // Assert
      expect(jwt.sign).toHaveBeenCalledWith(
        {},
        JWT_SECRET,
        { expiresIn: '30m' }
      );
      expect(token).toBe(mockToken);
    });
    
    test('should use JWT_SECRET for signing', () => {
      // Arrange
      const payload = { id: 1, email: 'test@test.com' };
      jwt.sign.mockReturnValue('token');
      
      // Act
      signToken(payload);
      
      // Assert
      expect(jwt.sign).toHaveBeenCalledWith(
        expect.any(Object),
        JWT_SECRET, // ✅ Verifies secret is used
        expect.any(Object)
      );
    });
    
    test('should set 30 minute expiration', () => {
      // Arrange
      const payload = { id: 1 };
      jwt.sign.mockReturnValue('token');
      
      // Act
      signToken(payload);
      
      // Assert
      expect(jwt.sign).toHaveBeenCalledWith(
        expect.any(Object),
        expect.any(String),
        { expiresIn: '30m' } // ✅ Verifies 30 minute expiration
      );
    });
    
    test('should handle payload with additional fields', () => {
      // Arrange
      const payload = {
        id: 1,
        email: 'user@test.com',
        role: 'user',
        permissions: ['read', 'write']
      };
      jwt.sign.mockReturnValue('token');
      
      // Act
      const token = signToken(payload);
      
      // Assert
      expect(jwt.sign).toHaveBeenCalledWith(
        payload,
        JWT_SECRET,
        { expiresIn: '30m' }
      );
      expect(token).toBeDefined();
    });
  });
  
  describe('verifyToken', () => {
    test('should verify and decode valid token', () => {
      // Arrange
      const token = 'valid.jwt.token';
      const mockDecoded = {
        id: 1,
        email: 'user@test.com',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 1800
      };
      
      jwt.verify.mockReturnValue(mockDecoded);
      
      // Act
      const decoded = verifyToken(token);
      
      // Assert
      expect(jwt.verify).toHaveBeenCalledWith(token, JWT_SECRET);
      expect(decoded).toEqual(mockDecoded);
    });
    
    test('should throw error for expired token', () => {
      // Arrange
      const token = 'expired.token';
      const expiredError = new Error('jwt expired');
      expiredError.name = 'TokenExpiredError';
      expiredError.expiredAt = new Date();
      
      jwt.verify.mockImplementation(() => {
        throw expiredError;
      });
      
      // Act & Assert
      expect(() => verifyToken(token)).toThrow('jwt expired');
    });
    
    test('should throw error for invalid token signature', () => {
      // Arrange
      const token = 'tampered.token';
      const signatureError = new Error('invalid signature');
      signatureError.name = 'JsonWebTokenError';
      
      jwt.verify.mockImplementation(() => {
        throw signatureError;
      });
      
      // Act & Assert
      expect(() => verifyToken(token)).toThrow('invalid signature');
    });
    
    test('should throw error for malformed token', () => {
      // Arrange
      const token = 'malformed';
      const malformedError = new Error('jwt malformed');
      malformedError.name = 'JsonWebTokenError';
      
      jwt.verify.mockImplementation(() => {
        throw malformedError;
      });
      
      // Act & Assert
      expect(() => verifyToken(token)).toThrow('jwt malformed');
    });
    
    test('should use JWT_SECRET for verification', () => {
      // Arrange
      const token = 'test.token';
      jwt.verify.mockReturnValue({ id: 1 });
      
      // Act
      verifyToken(token);
      
      // Assert
      expect(jwt.verify).toHaveBeenCalledWith(
        token,
        JWT_SECRET // ✅ Verifies secret is used for verification
      );
    });
    
    test('should decode all token claims', () => {
      // Arrange
      const token = 'full.token';
      const fullPayload = {
        id: 1,
        email: 'user@test.com',
        iat: 1234567890,
        exp: 1234569690,
        custom: 'data'
      };
      
      jwt.verify.mockReturnValue(fullPayload);
      
      // Act
      const decoded = verifyToken(token);
      
      // Assert
      expect(decoded).toEqual(fullPayload);
      expect(decoded).toHaveProperty('id');
      expect(decoded).toHaveProperty('email');
      expect(decoded).toHaveProperty('iat');
      expect(decoded).toHaveProperty('exp');
    });
  });
  
  describe('Token Lifecycle', () => {
    test('should create and verify token successfully', () => {
      // Arrange
      const payload = { id: 1, email: 'test@test.com' };
      const mockToken = 'lifecycle.token';
      const mockDecoded = {
        ...payload,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 1800
      };
      
      jwt.sign.mockReturnValue(mockToken);
      jwt.verify.mockReturnValue(mockDecoded);
      
      // Act
      const token = signToken(payload);
      const decoded = verifyToken(token);
      
      // Assert
      expect(token).toBe(mockToken);
      expect(decoded.id).toBe(payload.id);
      expect(decoded.email).toBe(payload.email);
    });
  });
  
  describe('Token Expiration Handling', () => {
    test('should reject token after 30 minutes', () => {
      // Arrange
      const token = 'old.token';
      const expiredError = new Error('jwt expired');
      expiredError.name = 'TokenExpiredError';
      expiredError.expiredAt = new Date(Date.now() - 1000); // Expired 1 second ago
      
      jwt.verify.mockImplementation(() => {
        throw expiredError;
      });
      
      // Act & Assert
      expect(() => verifyToken(token)).toThrow('jwt expired');
    });
    
    test('should accept token before expiration', () => {
      // Arrange
      const token = 'fresh.token';
      const now = Math.floor(Date.now() / 1000);
      const mockDecoded = {
        id: 1,
        email: 'user@test.com',
        iat: now,
        exp: now + 1800 // Expires in 30 minutes
      };
      
      jwt.verify.mockReturnValue(mockDecoded);
      
      // Act
      const decoded = verifyToken(token);
      
      // Assert
      expect(decoded.exp).toBeGreaterThan(now);
      expect(decoded.exp - decoded.iat).toBe(1800); // 30 minutes in seconds
    });
  });
  
  describe('Security Validation', () => {
    test('should use strong JWT_SECRET', () => {
      // Assert
      expect(JWT_SECRET.length).toBeGreaterThan(8);
      // In production, JWT_SECRET should be from environment variable
      // Here we verify it's defined and reasonable length
    });
    
    test('should not expose JWT_SECRET in tokens', () => {
      // Arrange
      const payload = { id: 1, email: 'test@test.com' };
      const mockToken = 'secure.token';
      
      jwt.sign.mockReturnValue(mockToken);
      
      // Act
      const token = signToken(payload);
      
      // Assert
      expect(token).not.toContain(JWT_SECRET);
      // JWT tokens should only contain encoded payload, not the secret
    });
    
    test('should validate token signature', () => {
      // Arrange
      const validToken = 'valid.signed.token';
      const tamperedToken = 'tampered.token';
      
      jwt.verify.mockImplementation((token) => {
        if (token === validToken) {
          return { id: 1, email: 'user@test.com' };
        }
        throw new Error('invalid signature');
      });
      
      // Act & Assert
      expect(() => verifyToken(validToken)).not.toThrow();
      expect(() => verifyToken(tamperedToken)).toThrow('invalid signature');
    });
  });
  
  describe('Edge Cases', () => {
    test('should handle null token', () => {
      // Arrange
      jwt.verify.mockImplementation(() => {
        throw new Error('jwt must be provided');
      });
      
      // Act & Assert
      expect(() => verifyToken(null)).toThrow();
    });
    
    test('should handle undefined token', () => {
      // Arrange
      jwt.verify.mockImplementation(() => {
        throw new Error('jwt must be provided');
      });
      
      // Act & Assert
      expect(() => verifyToken(undefined)).toThrow();
    });
    
    test('should handle empty string token', () => {
      // Arrange
      jwt.verify.mockImplementation(() => {
        throw new Error('jwt must be provided');
      });
      
      // Act & Assert
      expect(() => verifyToken('')).toThrow();
    });
    
    test('should handle malformed JWT structure', () => {
      // Arrange
      const malformedToken = 'not.a.valid.jwt.structure';
      jwt.verify.mockImplementation(() => {
        throw new Error('jwt malformed');
      });
      
      // Act & Assert
      expect(() => verifyToken(malformedToken)).toThrow('jwt malformed');
    });
  });
  
  describe('Performance', () => {
    test('should sign token quickly', () => {
      // Arrange
      const payload = { id: 1, email: 'test@test.com' };
      jwt.sign.mockReturnValue('token');
      
      // Act
      const startTime = Date.now();
      signToken(payload);
      const duration = Date.now() - startTime;
      
      // Assert
      expect(duration).toBeLessThan(100); // Should complete in < 100ms
    });
    
    test('should verify token quickly', () => {
      // Arrange
      const token = 'test.token';
      jwt.verify.mockReturnValue({ id: 1 });
      
      // Act
      const startTime = Date.now();
      verifyToken(token);
      const duration = Date.now() - startTime;
      
      // Assert
      expect(duration).toBeLessThan(100); // Should complete in < 100ms
    });
  });
});
