import { Router } from 'express';
import { authenticateJWT } from '../../core/authMiddleware';
import { authorize } from '../../core/rbacMiddleware';
import * as chatController from './chatController';

const router = Router();

// Customer & authenticated participant endpoints
router.get(
  '/my',
  authenticateJWT,
  authorize('Customer', 'SystemAdmin', 'BranchManager', 'Staff'),
  chatController.getMyConversation
);
router.get(
  '/:conversationId/messages',
  authenticateJWT,
  authorize('Customer', 'SystemAdmin', 'BranchManager', 'Staff'),
  chatController.getMessages
);
router.post(
  '/:conversationId/messages',
  authenticateJWT,
  authorize('Customer', 'SystemAdmin', 'BranchManager', 'Staff'),
  chatController.sendMessage
);
router.put(
  '/:conversationId/read',
  authenticateJWT,
  authorize('Customer', 'SystemAdmin', 'BranchManager', 'Staff'),
  chatController.markAsRead
);
router.put(
  '/:conversationId/reopen',
  authenticateJWT,
  authorize('Customer', 'SystemAdmin', 'BranchManager', 'Staff'),
  chatController.reopenConversation
);

// Staff / Manager console endpoints
router.get(
  '/staff/conversations',
  authenticateJWT,
  authorize('SystemAdmin', 'BranchManager', 'Staff'),
  chatController.getStaffConversations
);

router.put(
  '/:conversationId/claim',
  authenticateJWT,
  authorize('SystemAdmin', 'BranchManager', 'Staff'),
  chatController.claimConversation
);

router.put(
  '/:conversationId/close',
  authenticateJWT,
  authorize('SystemAdmin', 'BranchManager', 'Staff'),
  chatController.closeConversation
);

export default router;
