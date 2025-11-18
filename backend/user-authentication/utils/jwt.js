const jwt = require('jsonwebtoken');

const JWT_SECRET =
  process.env.JWT_SECRET ||
  'tiger-tix-dev-secret'; // fallback for local development

const TOKEN_EXPIRATION = '30m';
const TOKEN_EXPIRATION_MS = 30 * 60 * 1000;
const JWT_COOKIE_NAME = 'tt_auth_token';

const signToken = (payload = {}) =>
  jwt.sign(payload, JWT_SECRET, { expiresIn: TOKEN_EXPIRATION });

const verifyToken = (token) => jwt.verify(token, JWT_SECRET);

module.exports = {
  signToken,
  verifyToken,
  JWT_SECRET,
  TOKEN_EXPIRATION,
  TOKEN_EXPIRATION_MS,
  JWT_COOKIE_NAME
};
