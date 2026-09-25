import { Router } from 'express';
import {
  getAllLeads,
  getLeadById,
  importLeads,
  updateLead,
  deleteLead,
} from '../controllers/lead.controller';
import { uploadExcel } from '../middleware/upload.middleware';

const router = Router();

router.get('/', getAllLeads);
router.post('/import', uploadExcel.single('file'), importLeads);
router.get('/:id', getLeadById);
router.put('/:id', updateLead);
router.delete('/:id', deleteLead);

export default router;

