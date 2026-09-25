import { Router } from 'express';
import {
  getAllFollowUps,
  exportFollowUpsExcel,
  updateFollowUpStatus,
} from '../controllers/followUp.controller';

const router = Router();

router.get('/', getAllFollowUps);
router.get('/export', exportFollowUpsExcel);
router.patch('/:id', updateFollowUpStatus);

export default router;

