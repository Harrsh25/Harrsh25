const { verifyAccessToken } = require('../utils/jwt');
const { error } = require('../utils/response');

const authenticate = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return error(res, 'No token provided', 401);
  }
  const token = authHeader.split(' ')[1];
  try {
    const decoded = verifyAccessToken(token);
    req.user = decoded;
    next();
  } catch (err) {
    return error(res, 'Invalid or expired token', 401);
  }
};

const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) return error(res, 'Unauthorized', 401);
    if (!roles.includes(req.user.role)) {
      return error(res, 'Forbidden: insufficient permissions', 403);
    }
    next();
  };
};

const optionalAuth = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) return next();
  const token = authHeader.split(' ')[1];
  try {
    const decoded = verifyAccessToken(token);
    req.user = decoded;
  } catch (err) {
    // token invalid, continue without user
  }
  next();
};

module.exports = { authenticate, authorize, optionalAuth };
