import { Router } from 'express';
import {
  getAllNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
} from '../controllers/notification.controller';

const router = Router();

router.get('/', getAllNotifications);
router.patch('/:id/read', markNotificationAsRead);
router.post('/mark-all-read', markAllNotificationsAsRead);

export default router;

