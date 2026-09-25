import { Request, Response } from 'express';
import prisma from '../prisma/client';
import { sendSuccess, sendError } from '../utils/response';

export const getAllNotifications = async (_req: Request, res: Response) => {
  try {
    const notifications = await prisma.notification.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    return sendSuccess(res, notifications);
  } catch (err: any) {
    return sendError(res, 'NOTIFICATIONS_FETCH_ERROR', err.message, 500);
  }
};

export const markNotificationAsRead = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const notification = await prisma.notification.update({
      where: { id },
      data: { isRead: true },
    });
    return sendSuccess(res, notification, 'Notification marked as read');
  } catch (err: any) {
    return sendError(res, 'UPDATE_ERROR', err.message, 500);
  }
};

export const markAllNotificationsAsRead = async (_req: Request, res: Response) => {
  try {
    await prisma.notification.updateMany({
      where: { isRead: false },
      data: { isRead: true },
    });
    return sendSuccess(res, null, 'All notifications marked as read');
  } catch (err: any) {
    return sendError(res, 'UPDATE_ERROR', err.message, 500);
  }
};

