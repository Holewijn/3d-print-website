const express = require('express');
const router = express.Router();
const { login, logout, me } = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const rateLimit = require('express-rate-limit');

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 10,
  message: { error: 'Too many login attempts, please try again later' }
});

router.post('/login', loginLimiter, validate({
  email: { required: true, type: 'email' },
  password: { required: true, min: 1 }
}), login);

router.post('/logout', authenticate, logout);
router.get('/me', authenticate, me);

module.exports = router;
