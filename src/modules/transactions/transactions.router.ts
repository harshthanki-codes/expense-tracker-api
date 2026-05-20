import { Response, Router } from 'express';
import { AuthenticatedRequest } from '../../types';
import {
  createTransactionSchema,
  updateTransactionSchema,
  getTransactionsSchema,
  idParamSchema,
} from './transactions.schema';
import * as txService from './transactions.service';
import { respond } from '../../lib/response';
import { authenticate } from '../../middleware/authenticate';
import { parsePagination } from '../../lib/pagination';

// Controller

async function list(req: AuthenticatedRequest, res: Response): Promise<void> {
  const { query } = getTransactionsSchema.parse({ query: req.query });
  const { page, limit } = parsePagination(req);
  const result = await txService.listTransactions(req.user.id, query, page, limit);
  respond.ok(res, result);
}

async function getOne(req: AuthenticatedRequest, res: Response): Promise<void> {
  const { params } = idParamSchema.parse({ params: req.params });
  const tx = await txService.getTransaction(req.user.id, params.id);
  respond.ok(res, tx);
}

async function create(req: AuthenticatedRequest, res: Response): Promise<void> {
  const { body } = createTransactionSchema.parse({ body: req.body });
  const tx = await txService.createTransaction(req.user.id, body);
  respond.created(res, tx);
}

async function update(req: AuthenticatedRequest, res: Response): Promise<void> {
  const { body, params } = updateTransactionSchema.parse({ body: req.body, params: req.params });
  const tx = await txService.updateTransaction(req.user.id, params.id, body);
  respond.ok(res, tx);
}

async function remove(req: AuthenticatedRequest, res: Response): Promise<void> {
  const { params } = idParamSchema.parse({ params: req.params });
  await txService.deleteTransaction(req.user.id, params.id);
  respond.noContent(res);
}

// Router

const router = Router();
const auth = authenticate as never;
const cast = (fn: (req: AuthenticatedRequest, res: Response) => Promise<void>) => fn as never;

/**
 * @openapi
 * /transactions:
 *   get:
 *     tags: [Transactions]
 *     summary: List transactions with filtering, sorting, and pagination
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20, maximum: 100 }
 *       - in: query
 *         name: type
 *         schema: { type: string, enum: [INCOME, EXPENSE] }
 *       - in: query
 *         name: categoryId
 *         schema: { type: string, format: uuid }
 *       - in: query
 *         name: startDate
 *         schema: { type: string, format: date, example: '2024-01-01' }
 *       - in: query
 *         name: endDate
 *         schema: { type: string, format: date, example: '2024-12-31' }
 *       - in: query
 *         name: sortBy
 *         schema: { type: string, enum: [date, amount], default: date }
 *       - in: query
 *         name: order
 *         schema: { type: string, enum: [asc, desc], default: desc }
 *     responses:
 *       200:
 *         description: Paginated list of transactions
 *   post:
 *     tags: [Transactions]
 *     summary: Create a new transaction
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [type, amount, categoryId, date]
 *             properties:
 *               type:
 *                 type: string
 *                 enum: [INCOME, EXPENSE]
 *               amount:
 *                 type: number
 *                 format: float
 *                 example: 42.50
 *               categoryId:
 *                 type: string
 *                 format: uuid
 *               date:
 *                 type: string
 *                 format: date
 *                 example: '2024-06-15'
 *               note:
 *                 type: string
 *                 maxLength: 500
 *     responses:
 *       201:
 *         description: Transaction created
 *       400:
 *         description: Validation error
 */
router.get('/', auth, cast(list));
router.post('/', auth, cast(create));

/**
 * @openapi
 * /transactions/{id}:
 *   get:
 *     tags: [Transactions]
 *     summary: Get a single transaction
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Transaction details
 *       403:
 *         description: Transaction belongs to another user
 *       404:
 *         description: Transaction not found
 *   patch:
 *     tags: [Transactions]
 *     summary: Update a transaction
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               type: { type: string, enum: [INCOME, EXPENSE] }
 *               amount: { type: number }
 *               categoryId: { type: string, format: uuid }
 *               date: { type: string, format: date }
 *               note: { type: string }
 *     responses:
 *       200:
 *         description: Updated transaction
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Transaction not found
 *   delete:
 *     tags: [Transactions]
 *     summary: Delete a transaction
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       204:
 *         description: Deleted
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Transaction not found
 */
router.get('/:id', auth, cast(getOne));
router.patch('/:id', auth, cast(update));
router.delete('/:id', auth, cast(remove));

export { router as transactionsRouter };
