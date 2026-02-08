import { Router } from 'express';
import { authRouter } from './auth.js';
import { applicationRouter } from './applications.js';
import { reviewerRouter } from './reviewer.js';
import { ministerRouter } from './minister.js';
import { adminRouter } from './admin.js';
import { setupRouter } from './setup.js';

export const apiRouter = Router();

apiRouter.use('/auth', authRouter);
apiRouter.use('/setup', setupRouter);
apiRouter.use('/applications', applicationRouter);
apiRouter.use('/reviewer', reviewerRouter);
apiRouter.use('/minister', ministerRouter);
apiRouter.use('/admin', adminRouter);
