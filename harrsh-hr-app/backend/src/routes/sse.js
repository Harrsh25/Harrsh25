const router = require('express').Router();
const { verifyAccessToken } = require('../utils/jwt');
const { addClient, removeClient } = require('../services/notificationService');

// Custom auth for SSE - token can be in query param or Authorization header
const sseAuth = (req, res, next) => {
  const token = req.query.token || (req.headers['authorization'] || '').replace('Bearer ', '');
  if (!token) return res.status(401).end('Unauthorized');
  try {
    req.user = verifyAccessToken(token);
    next();
  } catch (_) {
    res.status(401).end('Invalid token');
  }
};

router.get('/events', sseAuth, (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  const userId = req.user.id;
  addClient(userId, res);

  // Send connected event
  res.write(`data: ${JSON.stringify({ type: 'connected', userId })}\n\n`);

  // Heartbeat every 30s
  const heartbeat = setInterval(() => {
    res.write(`: heartbeat\n\n`);
  }, 30000);

  req.on('close', () => {
    clearInterval(heartbeat);
    removeClient(userId);
  });
});

module.exports = router;
