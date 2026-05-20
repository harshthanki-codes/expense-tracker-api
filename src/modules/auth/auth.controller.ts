import { Request, Response } from 'express';
import { registerSchema, loginSchema, refreshSchema } from './auth.schema';
import * as authService from './auth.service';
import { respond } from '../../lib/response';
import { AuthenticatedRequest } from '../../types';

export async function register(req: Request, res: Response): Promise<void> {
  const { body } = registerSchema.parse({ body: req.body });
  const result = await authService.register(body);
  respond.created(res, result);
}

export async function login(req: Request, res: Response): Promise<void> {
  const { body } = loginSchema.parse({ body: req.body });
  const result = await authService.login(body);
  respond.ok(res, result);
}

export async function refresh(req: Request, res: Response): Promise<void> {
  const { body } = refreshSchema.parse({ body: req.body });
  const tokens = await authService.refreshTokens(body);
  respond.ok(res, tokens);
}

export async function logout(req: AuthenticatedRequest, res: Response): Promise<void> {
  const token = req.headers.authorization!.slice(7);
  await authService.logout(token);
  respond.noContent(res);
}
