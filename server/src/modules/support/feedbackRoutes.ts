import { Router, Request, Response, NextFunction } from 'express';
import { Feedback } from '../../models/Feedback';

const router = Router();

// Public feedback for homepage testimonials
router.get('/public', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const feedbacks = await Feedback.find({ isPublic: true, isBlocked: false, rating: { $gte: 4 } })
      .populate('userId', 'firstName lastName username avatarUrl')
      .populate('vehicleId', 'vehicleModel brand')
      .sort({ createdAt: -1 })
      .limit(6);

    res.json({
      success: true,
      count: feedbacks.length,
      data: feedbacks,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
