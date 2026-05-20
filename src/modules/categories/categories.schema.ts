import { z } from 'zod';

export const createCategorySchema = z.object({
  body: z.object({
    name: z.string().trim().min(2, 'Category name must be at least 2 characters').max(50),
  }),
});

export const updateCategorySchema = z.object({
  body: z.object({
    name: z.string().trim().min(2).max(50),
  }),
  params: z.object({ id: z.string().uuid() }),
});

export const idParamSchema = z.object({
  params: z.object({ id: z.string().uuid('Category ID must be a valid UUID') }),
});

export type CreateCategoryInput = z.infer<typeof createCategorySchema>['body'];
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>['body'];
