import { Response, Router } from 'express';
import { AuthenticatedRequest } from '../../types';
import {
  createCategorySchema,
  updateCategorySchema,
  idParamSchema,
} from './categories.schema';
import * as categoriesService from './categories.service';
import { respond } from '../../lib/response';
import { authenticate } from '../../middleware/authenticate';

// Controller

async function list(req: AuthenticatedRequest, res: Response): Promise<void> {
  const categories = await categoriesService.listCategories(req.user.id);
  respond.ok(res, categories);
}

async function create(req: AuthenticatedRequest, res: Response): Promise<void> {
  const { body } = createCategorySchema.parse({ body: req.body });
  const category = await categoriesService.createCategory(req.user.id, body);
  respond.created(res, category);
}

async function update(req: AuthenticatedRequest, res: Response): Promise<void> {
  const { body, params } = updateCategorySchema.parse({ body: req.body, params: req.params });
  const category = await categoriesService.updateCategory(req.user.id, params.id, body);
  respond.ok(res, category);
}

async function remove(req: AuthenticatedRequest, res: Response): Promise<void> {
  const { params } = idParamSchema.parse({ params: req.params });
  await categoriesService.deleteCategory(req.user.id, params.id);
  respond.noContent(res);
}

// Router

const router = Router();
const auth = authenticate as never;
const cast = (fn: (req: AuthenticatedRequest, res: Response) => Promise<void>) => fn as never;

/**
 * @openapi
 * /categories:
 *   get:
 *     tags: [Categories]
 *     summary: List all categories available to the user (default + custom)
 *     responses:
 *       200:
 *         description: Array of categories
 *   post:
 *     tags: [Categories]
 *     summary: Create a custom category
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name]
 *             properties:
 *               name:
 *                 type: string
 *                 minLength: 2
 *                 maxLength: 50
 *                 example: Subscriptions
 *     responses:
 *       201:
 *         description: Category created
 *       409:
 *         description: Category name already exists
 */
router.get('/', auth, cast(list));
router.post('/', auth, cast(create));

/**
 * @openapi
 * /categories/{id}:
 *   patch:
 *     tags: [Categories]
 *     summary: Rename a custom category
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
 *             required: [name]
 *             properties:
 *               name: { type: string }
 *     responses:
 *       200:
 *         description: Updated category
 *       400:
 *         description: Cannot modify default category
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Not found
 *   delete:
 *     tags: [Categories]
 *     summary: Delete a custom category (transactions reassigned to Other)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       204:
 *         description: Deleted
 *       400:
 *         description: Cannot delete default category
 *       403:
 *         description: Forbidden
 */
router.patch('/:id', auth, cast(update));
router.delete('/:id', auth, cast(remove));

export { router as categoriesRouter };
