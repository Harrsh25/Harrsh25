const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const { addClient, removeClient } = require('../services/notificationService');

router.get('/events', authenticate, (req, res) => {
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
