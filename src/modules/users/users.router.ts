import { Response, Router } from 'express';
import { AuthenticatedRequest } from '../../types';
import { updateProfileSchema, changePasswordSchema } from './users.schema';
import * as usersService from './users.service';
import { respond } from '../../lib/response';
import { authenticate } from '../../middleware/authenticate';

// Controller

async function getProfile(req: AuthenticatedRequest, res: Response): Promise<void> {
  const user = await usersService.getProfile(req.user.id);
  respond.ok(res, user);
}

async function updateProfile(req: AuthenticatedRequest, res: Response): Promise<void> {
  const { body } = updateProfileSchema.parse({ body: req.body });
  const user = await usersService.updateProfile(req.user.id, body);
  respond.ok(res, user);
}

async function changePassword(req: AuthenticatedRequest, res: Response): Promise<void> {
  const { body } = changePasswordSchema.parse({ body: req.body });
  await usersService.changePassword(req.user.id, body);
  respond.noContent(res);
}

// Router

const router = Router();
const auth = authenticate as never;
const cast = (fn: (req: AuthenticatedRequest, res: Response) => Promise<void>) =>
  fn as never;

/**
 * @openapi
 * /users/me:
 *   get:
 *     tags: [Users]
 *     summary: Get the authenticated user's profile
 *     responses:
 *       200:
 *         description: User profile
 *       401:
 *         description: Unauthorized
 *   patch:
 *     tags: [Users]
 *     summary: Update name or email
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *                 format: email
 *     responses:
 *       200:
 *         description: Updated profile
 *       409:
 *         description: Email already in use
 */
router.get('/me', auth, cast(getProfile));
router.patch('/me', auth, cast(updateProfile));

/**
 * @openapi
 * /users/me/password:
 *   patch:
 *     tags: [Users]
 *     summary: Change password
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [currentPassword, newPassword]
 *             properties:
 *               currentPassword:
 *                 type: string
 *               newPassword:
 *                 type: string
 *                 minLength: 8
 *     responses:
 *       204:
 *         description: Password changed
 *       401:
 *         description: Current password incorrect
 */
router.patch('/me/password', auth, cast(changePassword));

export { router as usersRouter };
