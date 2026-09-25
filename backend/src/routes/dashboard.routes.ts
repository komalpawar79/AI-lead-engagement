import { Router } from 'express';
import { getDashboardSummary, getDashboardActivity } from '../controllers/dashboard.controller';

const router = Router();

router.get('/summary', getDashboardSummary);
router.get('/activity', getDashboardActivity);

export default router;

