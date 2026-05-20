import { Response } from 'express';
import { ApiResponse } from '../types';

export const respond = {
  ok<T>(res: Response, data: T, status = 200): void {
    res.status(status).json({ success: true, data } satisfies ApiResponse<T>);
  },

  created<T>(res: Response, data: T): void {
    res.status(201).json({ success: true, data } satisfies ApiResponse<T>);
  },

  noContent(res: Response): void {
    res.status(204).send();
  },

  error(res: Response, message: string, status: number, details?: Record<string, string[]>): void {
    const body: ApiResponse = { success: false, error: message };
    if (details) body.details = details;
    res.status(status).json(body);
  },
};
