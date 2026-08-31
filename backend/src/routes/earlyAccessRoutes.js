/**
 * MoneyLink — Routes Early Access (/api/early-access)
 */

import { Router } from 'express';
import { EarlyAccessController } from '../controllers/earlyAccessController.js';
import { validate } from '../middleware/validate.js';
import { earlyAccessSchema } from '../validators/schemas.js';

const router = Router();

router.post('/', validate(earlyAccessSchema), EarlyAccessController.register);
router.get('/stats', EarlyAccessController.getStats);

export default router;
