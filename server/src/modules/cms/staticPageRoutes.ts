import { Router } from 'express';
import { getPublicPage } from './staticPageController';
import { adminPageRouter, publicPageRouter } from './pageRoutes';

export { adminPageRouter, publicPageRouter };

const router = Router();
router.get('/:slug', getPublicPage);
export default router;
