import { Router } from 'express';
import { authenticateJWT } from '../../core/authMiddleware';
import { authorize } from '../../core/rbacMiddleware';
import * as scheduleController from './scheduleController';

const router = Router();

// All schedule routes require authentication
router.use(authenticateJWT);

// Get my today's schedule for quick clock-in/out
router.get('/today', scheduleController.getMyTodaySchedule);

// List schedules (Filtered by role in controller)
router.get('/', authorize('Staff', 'BranchManager', 'SystemAdmin'), scheduleController.getSchedules);

// Clock in / out (Staff can clock themselves, manager/admin can assist)
router.put('/:id/clock', authorize('Staff', 'BranchManager', 'SystemAdmin'), scheduleController.clockAttendance);

// Manager / Admin schedule assignments
router.post('/', authorize('BranchManager', 'SystemAdmin'), scheduleController.createSchedule);
router.put('/:id', authorize('BranchManager', 'SystemAdmin'), scheduleController.updateSchedule);
router.delete('/:id', authorize('BranchManager', 'SystemAdmin'), scheduleController.deleteSchedule);

export default router;
