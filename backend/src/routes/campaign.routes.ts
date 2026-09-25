import { Router } from 'express';
import {
  getAllCampaigns,
  getCampaignById,
  createCampaign,
  startCampaign,
  pauseCampaign,
  resumeCampaign,
} from '../controllers/campaign.controller';

const router = Router();

router.get('/', getAllCampaigns);
router.post('/', createCampaign);
router.get('/:id', getCampaignById);
router.post('/:id/start', startCampaign);
router.post('/:id/pause', pauseCampaign);
router.post('/:id/resume', resumeCampaign);

export default router;

