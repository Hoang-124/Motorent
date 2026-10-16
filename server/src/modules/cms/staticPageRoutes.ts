import { Router } from 'express';
import { getPublicPage } from './staticPageController';

const router = Router();

router.get('/:slug', getPublicPage);

export default router;
