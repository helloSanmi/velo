import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate.js';
import { createRateLimitMiddleware } from '../../middleware/rateLimit.js';
import { registerAuthOauthRoutes } from './auth.oauth.routes.js';
import {
  acceptInviteHandler,
  changePasswordHandler,
  loginHandler,
  logoutHandler,
  meHandler,
  previewInviteHandler,
  refreshHandler,
  registerHandler,
  resetPasswordHandler
} from './auth.routes.handlers.js';

const router = Router();
router.use(
  createRateLimitMiddleware({
    windowMs: 60_000,
    maxRequests: 60,
    keyPrefix: 'auth',
    message: 'Too many auth requests. Please wait a moment and try again.'
  })
);

router.post('/register', registerHandler);
router.post('/invites/accept', acceptInviteHandler);
router.get('/invites/:token', previewInviteHandler);
router.post('/login', loginHandler);
router.post('/refresh', refreshHandler);
router.post('/logout', authenticate, logoutHandler);
router.post('/change-password', authenticate, changePasswordHandler);
router.post('/reset-password', resetPasswordHandler);

registerAuthOauthRoutes(router);

router.get('/me', authenticate, meHandler);

export const authRoutes = router;
