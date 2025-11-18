const { verifyToken, JWT_COOKIE_NAME } = require('../utils/jwt');

const getTokenFromRequest = (req) => {
  const header = req.headers.authorization || '';
  if (header.startsWith('Bearer ')) {
    return header.slice(7);
  }

  if (req.cookies && req.cookies[JWT_COOKIE_NAME]) {
    return req.cookies[JWT_COOKIE_NAME];
  }

  return null;
};

const requireAuth = (req, res, next) => {
  const token = getTokenFromRequest(req);

  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    const decoded = verifyToken(token);
    req.user = { id: decoded.id, email: decoded.email };
    return next();
  } catch (error) {
    return res.status(401).json({
      error: 'Token is invalid or has expired'
    });
  }
};

const attachUserIfAvailable = (req, _res, next) => {
  const token = getTokenFromRequest(req);
  if (!token) {
    return next();
  }

  try {
    const decoded = verifyToken(token);
    req.user = { id: decoded.id, email: decoded.email };
  } catch (error) {
    // Ignore invalid token for optional middleware
  }

  return next();
};

module.exports = {
  requireAuth,
  attachUserIfAvailable
};
