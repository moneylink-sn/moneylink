/**
 * MoneyLink — Routes Authentification (/api/auth)
 */

import { Router } from 'express';
import { AuthController } from '../controllers/authController.js';
import { authenticateJWT } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { registerSchema, loginSchema } from '../validators/schemas.js';

const router = Router();

router.post('/register', validate(registerSchema), AuthController.register);
router.post('/login', validate(loginSchema), AuthController.login);
router.get('/profile', authenticateJWT, AuthController.getProfile);

export default router;
