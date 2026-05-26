const router = require('express').Router();
const passport = require('../middleware/passport');
const { PrismaClient } = require('@prisma/client');
const { generateAccessToken, generateRefreshToken } = require('../utils/jwt');
const prisma = new PrismaClient();

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

// Google OAuth
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'], session: false }));

router.get('/google/callback',
  passport.authenticate('google', { session: false, failureRedirect: `${FRONTEND_URL}/login?error=sso_failed` }),
  async (req, res) => {
    try {
      const user = req.user;
      const accessToken = generateAccessToken({ id: user.id, email: user.email, role: user.role, organizationId: user.organizationId });
      const refreshTokenStr = generateRefreshToken({ id: user.id });
      await prisma.refreshToken.create({
        data: { token: refreshTokenStr, userId: user.id, expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) },
      });

      // Redirect to frontend with tokens in query (frontend stores them)
      res.redirect(`${FRONTEND_URL}/sso-callback?accessToken=${accessToken}&refreshToken=${refreshTokenStr}`);
    } catch (err) {
      res.redirect(`${FRONTEND_URL}/login?error=sso_failed`);
    }
  }
);

// SSO status — tells frontend what SSO providers are configured
router.get('/providers', (req, res) => {
  const providers = [];
  if (process.env.GOOGLE_CLIENT_ID) providers.push({ id: 'google', name: 'Google', icon: 'google' });
  if (process.env.AZURE_CLIENT_ID) providers.push({ id: 'microsoft', name: 'Microsoft', icon: 'microsoft' });
  res.json({ success: true, data: { providers } });
});

module.exports = router;
