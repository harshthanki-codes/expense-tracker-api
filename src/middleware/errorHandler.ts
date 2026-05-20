import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';
import { AppError } from '../lib/errors';
import { logger } from '../config/logger';
import { env } from '../config/env';

export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction,
): void {
  // Known domain errors
  if (err instanceof AppError) {
    if (err.statusCode >= 500) {
      logger.error({ err, path: req.path, method: req.method }, 'Application error');
    }
    res.status(err.statusCode).json({
      success: false,
      error: err.message,
      ...(err.details && { details: err.details }),
    });
    return;
  }

  // Zod validation errors
  if (err instanceof ZodError) {
    const details = err.errors.reduce<Record<string, string[]>>((acc, issue) => {
      const key = issue.path.join('.') || 'root';
      acc[key] = [...(acc[key] ?? []), issue.message];
      return acc;
    }, {});

    res.status(400).json({ success: false, error: 'Validation failed', details });
    return;
  }

  // Prisma unique constraint violation
  if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
    const fields = (err.meta?.['target'] as string[]) ?? ['field'];
    res.status(409).json({ success: false, error: `${fields.join(', ')} already in use` });
    return;
  }

  // Prisma record not found
  if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2025') {
    res.status(404).json({ success: false, error: 'Record not found' });
    return;
  }

  // Unhandled — log and return a generic message
  logger.error({ err, path: req.path, method: req.method }, 'Unhandled error');
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    ...(env.NODE_ENV === 'development' && { debug: String(err) }),
  });
}
