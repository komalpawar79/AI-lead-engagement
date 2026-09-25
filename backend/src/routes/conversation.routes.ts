import { Router } from 'express';
import {
  getConversationByLeadId,
  sendMessage,
  createOrGetTestConversation,
  resetTestConversation,
} from '../controllers/conversation.controller';

const router = Router();

router.get('/lead/:leadId', getConversationByLeadId); 
router.post('/message', sendMessage);
router.post('/test-lead', createOrGetTestConversation);
router.post('/test-lead/:leadId/reset', resetTestConversation);

export default router;

