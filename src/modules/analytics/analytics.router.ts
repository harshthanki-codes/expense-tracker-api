import { z } from 'zod';
import { Response, Router } from 'express';
import { AuthenticatedRequest } from '../../types';
import * as analyticsService from './analytics.service';
import { respond } from '../../lib/response';
import { authenticate } from '../../middleware/authenticate';

const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((d) => !isNaN(Date.parse(d)));

const periodSchema = z.object({
  query: z.object({
    startDate: dateSchema,
    endDate: dateSchema,
  }).refine((d) => new Date(d.startDate) <= new Date(d.endDate), {
    message: 'startDate must be before or equal to endDate',
  }),
});

const monthlySchema = z.object({
  query: z.object({
    months: z.coerce.number().int().min(1).max(24).default(6),
  }),
});

// Controller

async function summary(req: AuthenticatedRequest, res: Response): Promise<void> {
  const { query } = periodSchema.parse({ query: req.query });
  const result = await analyticsService.getSummary(req.user.id, query);
  respond.ok(res, result);
}

async function spendingByCategory(req: AuthenticatedRequest, res: Response): Promise<void> {
  const { query } = periodSchema.parse({ query: req.query });
  const result = await analyticsService.getSpendingByCategory(req.user.id, query);
  respond.ok(res, result);
}

async function monthlyTrend(req: AuthenticatedRequest, res: Response): Promise<void> {
  const { query } = monthlySchema.parse({ query: req.query });
  const result = await analyticsService.getMonthlyTrend(req.user.id, query);
  respond.ok(res, result);
}

// Router

const router = Router();
const auth = authenticate as never;
const cast = (fn: (req: AuthenticatedRequest, res: Response) => Promise<void>) => fn as never;

/**
 * @openapi
 * /analytics/summary:
 *   get:
 *     tags: [Analytics]
 *     summary: Total income, expenses, and net balance for a period
 *     parameters:
 *       - in: query
 *         name: startDate
 *         required: true
 *         schema: { type: string, format: date, example: '2024-01-01' }
 *       - in: query
 *         name: endDate
 *         required: true
 *         schema: { type: string, format: date, example: '2024-12-31' }
 *     responses:
 *       200:
 *         description: Financial summary
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data:
 *                   type: object
 *                   properties:
 *                     income: { type: number, example: 5000 }
 *                     expenses: { type: number, example: 3200 }
 *                     net: { type: number, example: 1800 }
 */
router.get('/summary', auth, cast(summary));

/**
 * @openapi
 * /analytics/spending-by-category:
 *   get:
 *     tags: [Analytics]
 *     summary: Expense breakdown by category with percentages
 *     parameters:
 *       - in: query
 *         name: startDate
 *         required: true
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: endDate
 *         required: true
 *         schema: { type: string, format: date }
 *     responses:
 *       200:
 *         description: Category breakdown
 */
router.get('/spending-by-category', auth, cast(spendingByCategory));

/**
 * @openapi
 * /analytics/monthly-trend:
 *   get:
 *     tags: [Analytics]
 *     summary: Month-over-month income and expense summary
 *     parameters:
 *       - in: query
 *         name: months
 *         schema: { type: integer, default: 6, minimum: 1, maximum: 24 }
 *         description: Number of past months to include
 *     responses:
 *       200:
 *         description: Monthly trend data
 */
router.get('/monthly-trend', auth, cast(monthlyTrend));

export { router as analyticsRouter };
