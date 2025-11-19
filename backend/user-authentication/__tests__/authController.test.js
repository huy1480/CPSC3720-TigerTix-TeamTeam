/**
 * Authentication Controller Unit Tests
 * 
 * Purpose: Test user registration, login, logout, and JWT token handling
 * 
 * Test Coverage:
 * - User registration with valid/invalid data
 * - User login with valid/invalid credentials
 * - Password hashing verification
 * - JWT token generation and storage
 * - Session management (logout)
 * - Error handling and validation
 */

const authController = require('../controllers/authController');
const userModel = require('../models/userModel');
const bcrypt = require('bcryptjs');
const { signToken } = require('../utils/jwt');

// Mock dependencies
jest.mock('../models/userModel');
jest.mock('bcryptjs');
jest.mock('../utils/jwt');

describe('Authentication Controller Tests', () => {
  let mockRequest;
  let mockResponse;
  
  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks();
    
    // Setup mock request and response objects
    mockRequest = {
      body: {},
      user: null,
      cookies: {}
    };
    
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      cookie: jest.fn().mockReturnThis(),
      clearCookie: jest.fn().mockReturnThis()
    };
  });
  
  describe('register', () => {
    test('should register new user with valid data', async () => {
      // Arrange
      mockRequest.body = {
        email: 'newuser@test.com',
        password: 'SecurePass123'
      };
      
      const mockHashedPassword = '$2a$10$hashedpassword';
      const mockUser = {
        id: 1,
        email: 'newuser@test.com'
      };
      const mockToken = 'mock.jwt.token';
      
      userModel.findByEmail.mockResolvedValue(null); // User doesn't exist
      bcrypt.hash.mockResolvedValue(mockHashedPassword);
      userModel.createUser.mockResolvedValue(mockUser);
      signToken.mockReturnValue(mockToken);
      
      // Act
      await authController.register(mockRequest, mockResponse);
      
      // Assert
      expect(userModel.findByEmail).toHaveBeenCalledWith('newuser@test.com');
      expect(bcrypt.hash).toHaveBeenCalledWith('SecurePass123', 10);
      expect(userModel.createUser).toHaveBeenCalledWith('newuser@test.com', mockHashedPassword);
      expect(signToken).toHaveBeenCalledWith({
        id: 1,
        email: 'newuser@test.com'
      });
      expect(mockResponse.cookie).toHaveBeenCalledWith(
        'tt_auth_token',
        mockToken,
        expect.objectContaining({
          httpOnly: true,
          sameSite: 'lax'
        })
      );
      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'Registration successful',
        user: { id: 1, email: 'newuser@test.com' }
      });
    });
    
    test('should reject registration with missing email', async () => {
      // Arrange
      mockRequest.body = {
        password: 'SecurePass123'
      };
      
      // Act
      await authController.register(mockRequest, mockResponse);
      
      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Email and password are required'
      });
      expect(userModel.createUser).not.toHaveBeenCalled();
    });
    
    test('should reject registration with missing password', async () => {
      // Arrange
      mockRequest.body = {
        email: 'test@test.com'
      };
      
      // Act
      await authController.register(mockRequest, mockResponse);
      
      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Email and password are required'
      });
    });
    
    test('should reject registration with short password', async () => {
      // Arrange
      mockRequest.body = {
        email: 'test@test.com',
        password: 'short'
      };
      
      // Act
      await authController.register(mockRequest, mockResponse);
      
      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Password must be at least 8 characters long'
      });
      expect(bcrypt.hash).not.toHaveBeenCalled();
    });
    
    test('should reject registration with duplicate email', async () => {
      // Arrange
      mockRequest.body = {
        email: 'existing@test.com',
        password: 'SecurePass123'
      };
      
      userModel.findByEmail.mockResolvedValue({
        id: 1,
        email: 'existing@test.com'
      });
      
      // Act
      await authController.register(mockRequest, mockResponse);
      
      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(409);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'An account with that email already exists'
      });
      expect(bcrypt.hash).not.toHaveBeenCalled();
      expect(userModel.createUser).not.toHaveBeenCalled();
    });
    
    test('should normalize email to lowercase', async () => {
      // Arrange
      mockRequest.body = {
        email: 'Test@TEST.COM',
        password: 'SecurePass123'
      };
      
      userModel.findByEmail.mockResolvedValue(null);
      bcrypt.hash.mockResolvedValue('hashedpass');
      userModel.createUser.mockResolvedValue({ id: 1, email: 'test@test.com' });
      signToken.mockReturnValue('token');
      
      // Act
      await authController.register(mockRequest, mockResponse);
      
      // Assert
      expect(userModel.findByEmail).toHaveBeenCalledWith('test@test.com');
      expect(userModel.createUser).toHaveBeenCalledWith('test@test.com', 'hashedpass');
    });
    
    test('should handle database errors gracefully', async () => {
      // Arrange
      mockRequest.body = {
        email: 'test@test.com',
        password: 'SecurePass123'
      };
      
      userModel.findByEmail.mockRejectedValue(new Error('Database connection failed'));
      
      // Act
      await authController.register(mockRequest, mockResponse);
      
      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Unable to complete registration'
      });
    });
  });
  
  describe('login', () => {
    test('should login user with valid credentials', async () => {
      // Arrange
      mockRequest.body = {
        email: 'user@test.com',
        password: 'CorrectPassword'
      };
      
      const mockUser = {
        id: 1,
        email: 'user@test.com',
        password_hash: '$2a$10$hashedpassword'
      };
      const mockToken = 'mock.jwt.token';
      
      userModel.findByEmail.mockResolvedValue(mockUser);
      bcrypt.compare.mockResolvedValue(true);
      signToken.mockReturnValue(mockToken);
      
      // Act
      await authController.login(mockRequest, mockResponse);
      
      // Assert
      expect(userModel.findByEmail).toHaveBeenCalledWith('user@test.com');
      expect(bcrypt.compare).toHaveBeenCalledWith('CorrectPassword', mockUser.password_hash);
      expect(signToken).toHaveBeenCalledWith({
        id: 1,
        email: 'user@test.com'
      });
      expect(mockResponse.cookie).toHaveBeenCalledWith(
        'tt_auth_token',
        mockToken,
        expect.any(Object)
      );
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'Login successful',
        user: { id: 1, email: 'user@test.com' }
      });
    });
    
    test('should reject login with non-existent email', async () => {
      // Arrange
      mockRequest.body = {
        email: 'nonexistent@test.com',
        password: 'SomePassword'
      };
      
      userModel.findByEmail.mockResolvedValue(null);
      
      // Act
      await authController.login(mockRequest, mockResponse);
      
      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Invalid credentials'
      });
      expect(bcrypt.compare).not.toHaveBeenCalled();
    });
    
    test('should reject login with wrong password', async () => {
      // Arrange
      mockRequest.body = {
        email: 'user@test.com',
        password: 'WrongPassword'
      };
      
      const mockUser = {
        id: 1,
        email: 'user@test.com',
        password_hash: '$2a$10$hashedpassword'
      };
      
      userModel.findByEmail.mockResolvedValue(mockUser);
      bcrypt.compare.mockResolvedValue(false);
      
      // Act
      await authController.login(mockRequest, mockResponse);
      
      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Invalid credentials'
      });
      expect(signToken).not.toHaveBeenCalled();
      expect(mockResponse.cookie).not.toHaveBeenCalled();
    });
    
    test('should reject login with missing credentials', async () => {
      // Arrange
      mockRequest.body = {};
      
      // Act
      await authController.login(mockRequest, mockResponse);
      
      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Email and password are required'
      });
    });
    
    test('should handle database errors during login', async () => {
      // Arrange
      mockRequest.body = {
        email: 'user@test.com',
        password: 'password'
      };
      
      userModel.findByEmail.mockRejectedValue(new Error('Database error'));
      
      // Act
      await authController.login(mockRequest, mockResponse);
      
      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Unable to complete login'
      });
    });
  });
  
  describe('logout', () => {
    test('should clear authentication cookie on logout', async () => {
      // Act
      await authController.logout(mockRequest, mockResponse);
      
      // Assert
      expect(mockResponse.clearCookie).toHaveBeenCalledWith(
        'tt_auth_token',
        expect.objectContaining({
          httpOnly: true,
          sameSite: 'lax',
          maxAge: 0
        })
      );
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'Logged out successfully'
      });
    });
  });
  
  describe('me', () => {
    test('should return current user information', async () => {
      // Arrange
      mockRequest.user = {
        id: 1,
        email: 'user@test.com'
      };
      
      // Act
      await authController.me(mockRequest, mockResponse);
      
      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        user: {
          id: 1,
          email: 'user@test.com'
        }
      });
    });
  });
  
  describe('Password Security', () => {
    test('should hash password with bcrypt (10 rounds minimum)', async () => {
      // Arrange
      mockRequest.body = {
        email: 'test@test.com',
        password: 'SecurePass123'
      };
      
      userModel.findByEmail.mockResolvedValue(null);
      bcrypt.hash.mockResolvedValue('$2a$10$hashedpassword');
      userModel.createUser.mockResolvedValue({ id: 1, email: 'test@test.com' });
      signToken.mockReturnValue('token');
      
      // Act
      await authController.register(mockRequest, mockResponse);
      
      // Assert
      expect(bcrypt.hash).toHaveBeenCalledWith('SecurePass123', 10);
    });
  });
  
  describe('Token Security', () => {
    test('should store token in HTTP-only cookie', async () => {
      // Arrange
      mockRequest.body = {
        email: 'user@test.com',
        password: 'password'
      };
      
      const mockUser = {
        id: 1,
        email: 'user@test.com',
        password_hash: 'hashed'
      };
      
      userModel.findByEmail.mockResolvedValue(mockUser);
      bcrypt.compare.mockResolvedValue(true);
      signToken.mockReturnValue('token');
      
      // Act
      await authController.login(mockRequest, mockResponse);
      
      // Assert
      expect(mockResponse.cookie).toHaveBeenCalledWith(
        'tt_auth_token',
        'token',
        expect.objectContaining({
          httpOnly: true, // ✅ Prevents XSS attacks
          sameSite: 'lax' // ✅ Prevents CSRF attacks
        })
      );
    });
    
    test('should set secure flag in production', async () => {
      // Arrange
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';
      
      mockRequest.body = {
        email: 'user@test.com',
        password: 'password'
      };
      
      const mockUser = {
        id: 1,
        email: 'user@test.com',
        password_hash: 'hashed'
      };
      
      userModel.findByEmail.mockResolvedValue(mockUser);
      bcrypt.compare.mockResolvedValue(true);
      signToken.mockReturnValue('token');
      
      // Act
      await authController.login(mockRequest, mockResponse);
      
      // Assert
      expect(mockResponse.cookie).toHaveBeenCalledWith(
        'tt_auth_token',
        'token',
        expect.objectContaining({
          secure: true // ✅ HTTPS only in production
        })
      );
      
      // Cleanup
      process.env.NODE_ENV = originalEnv;
    });
  });
});
