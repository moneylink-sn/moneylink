/**
 * MoneyLink — Routes Contact & Assistance (/api/contact)
 */

import { Router } from 'express';
import { ContactController } from '../controllers/contactController.js';
import { validate } from '../middleware/validate.js';
import { contactSchema } from '../validators/schemas.js';

const router = Router();

router.post('/', validate(contactSchema), ContactController.submit);

export default router;
