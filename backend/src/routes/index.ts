import { Router } from 'express';
import authRoutes from './auth.routes';
import dashboardRoutes from './dashboard.routes';
import projectRoutes from './project.routes';
import leadRoutes from './lead.routes';
import campaignRoutes from './campaign.routes';
import conversationRoutes from './conversation.routes';
import followUpRoutes from './followUp.routes';
import notificationRoutes from './notification.routes';
import webhookRoutes from './webhook.routes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/projects', projectRoutes);
router.use('/leads', leadRoutes);
router.use('/campaigns', campaignRoutes);
router.use('/conversations', conversationRoutes);
router.use('/follow-ups', followUpRoutes);
router.use('/notifications', notificationRoutes);
router.use('/webhooks', webhookRoutes);

// Health check endpoint
router.get('/health', (_req, res) => {
  res.json({
    status: 'UP',
    service: 'AI LeadEngage API',
    timestamp: new Date().toISOString(),
  });
});

export default router;

