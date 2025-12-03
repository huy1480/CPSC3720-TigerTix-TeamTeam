const bcrypt = require('bcryptjs');
const userModel = require('../models/userModel');
const {
  signToken,
  TOKEN_EXPIRATION_MS,
  JWT_COOKIE_NAME
} = require('../utils/jwt');

const authCookieOptions = {
  httpOnly: true,
  sameSite: 'lax',
  secure: process.env.NODE_ENV === 'production',
  maxAge: TOKEN_EXPIRATION_MS
};

const normalizeEmail = (email = '') => email.trim().toLowerCase();

const setSessionCookie = (res, token) => {
  res.cookie(JWT_COOKIE_NAME, token, authCookieOptions);
};

const clearSessionCookie = (res) => {
  res.clearCookie(JWT_COOKIE_NAME, {
    ...authCookieOptions,
    maxAge: 0
  });
};

const buildUserResponse = (user) => ({
  id: user.id,
  email: user.email
});

exports.register = async (req, res) => {
  try {
    const { email, password } = req.body || {};

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    if (password.length < 8) {
      return res
        .status(400)
        .json({ error: 'Password must be at least 8 characters long' });
    }

    const normalizedEmail = normalizeEmail(email);
    const existingUser = await userModel.findByEmail(normalizedEmail);

    if (existingUser) {
      return res
        .status(409)
        .json({ error: 'An account with that email already exists' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await userModel.createUser(normalizedEmail, passwordHash);
    const token = signToken({ id: user.id, email: user.email });

    setSessionCookie(res, token);

    res.status(201).json({
      message: 'Registration successful',
      user: buildUserResponse(user),
      token
    });
  } catch (error) {
    console.error('Registration failed:', error);
    res.status(500).json({
      error: 'Unable to complete registration'
    });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body || {};

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const user = await userModel.findByEmail(email);

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const passwordMatch = await bcrypt.compare(password, user.password_hash);

    if (!passwordMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = signToken({ id: user.id, email: user.email });
    setSessionCookie(res, token);

    res.status(200).json({
      message: 'Login successful',
      user: buildUserResponse(user),
      token
    });
  } catch (error) {
    console.error('Login failed:', error);
    res.status(500).json({
      error: 'Unable to complete login'
    });
  }
};

exports.logout = async (_req, res) => {
  clearSessionCookie(res);
  res.status(200).json({ message: 'Logged out successfully' });
};

exports.me = async (req, res) => {
  res.status(200).json({
    user: buildUserResponse(req.user)
  });
};
