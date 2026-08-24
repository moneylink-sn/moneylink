/**
 * MoneyLink — Routes Coffres d'Épargne (/api/savings)
 */

import { Router } from 'express';
import { SavingsController } from '../controllers/savingsController.js';
import { authenticateJWT } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { savingsGoalSchema, contributeSchema } from '../validators/schemas.js';

const router = Router();

router.use(authenticateJWT);

router.post('/', validate(savingsGoalSchema), SavingsController.createGoal);
router.get('/', SavingsController.getGoals);
router.get('/:id', SavingsController.getGoalById);
router.post('/:id/contribute', validate(contributeSchema), SavingsController.contribute);
router.post('/:id/invite', SavingsController.inviteMember);

export default router;
