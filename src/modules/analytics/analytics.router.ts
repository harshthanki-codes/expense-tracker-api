import { Router, Response } from 'express';

import * as analyticsService from './analytics.service';

import { authenticate } from '../../middleware/authenticate';
import { AuthenticatedRequest } from '../../types';

const router = Router();

router.use(authenticate);

router.get(
  '/summary',
  async (
    req: AuthenticatedRequest,
    res: Response,
  ): Promise<void> => {
    const query = {
      startDate: req.query.startDate as string,
      endDate: req.query.endDate as string,
    };

    const result = await analyticsService.getSummary(
      req.user.id,
      query as any,
    );

    res.json({
      success: true,
      data: result,
    });
  },
);

router.get(
  '/spending-by-category',
  async (
    req: AuthenticatedRequest,
    res: Response,
  ): Promise<void> => {
    const query = {
      startDate: req.query.startDate as string,
      endDate: req.query.endDate as string,
    };

    const result =
      await analyticsService.getSpendingByCategory(
        req.user.id,
        query as any,
      );

    res.json({
      success: true,
      data: result,
    });
  },
);

router.get(
  '/monthly-trend',
  async (
    req: AuthenticatedRequest,
    res: Response,
  ): Promise<void> => {
    const query = {
      months: Number(req.query.months || 6),
    };

    const result =
      await analyticsService.getMonthlyTrend(
        req.user.id,
        query as any,
      );

    res.json({
      success: true,
      data: result,
    });
  },
);

export default router;