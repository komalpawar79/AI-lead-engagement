import { Router } from 'express';
import {
  verifyWhatsAppWebhook,
  handleWhatsAppWebhook,
} from '../controllers/webhook.controller';

const router = Router();

// Meta WhatsApp Cloud API verification
router.get('/whatsapp', verifyWhatsAppWebhook);

// Meta WhatsApp Inbound webhook events
router.post('/whatsapp', handleWhatsAppWebhook);

export default router;

