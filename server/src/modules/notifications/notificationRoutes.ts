import { Router } from 'express';
import { authenticateJWT } from '../../core/authMiddleware';
import * as notificationController from './notificationController';

const router = Router();

router.use(authenticateJWT);
router.get('/unread-count', notificationController.getUnreadCount);
router.get('/', notificationController.listNotifications);
router.put('/read-all', notificationController.markAllNotificationsRead);
router.put('/:id/read', notificationController.markNotificationRead);

export default router;
