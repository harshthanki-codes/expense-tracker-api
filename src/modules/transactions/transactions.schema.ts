import { z } from 'zod';
import { TransactionType } from '@prisma/client';

const amountSchema = z
  .number()
  .positive('Amount must be greater than 0')
  .multipleOf(0.01, 'Amount can have at most 2 decimal places')
  .max(999_999_999, 'Amount exceeds maximum allowed value');

const dateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format')
  .refine((d) => !isNaN(Date.parse(d)), 'Invalid date');

export const createTransactionSchema = z.object({
  body: z.object({
    type: z.nativeEnum(TransactionType),
    amount: amountSchema,
    categoryId: z.string().uuid('Category ID must be a valid UUID'),
    date: dateSchema,
    note: z.string().trim().max(500).optional(),
  }),
});

export const updateTransactionSchema = z.object({
  body: z.object({
    type: z.nativeEnum(TransactionType).optional(),
    amount: amountSchema.optional(),
    categoryId: z.string().uuid().optional(),
    date: dateSchema.optional(),
    note: z.string().trim().max(500).nullable().optional(),
  }),
  params: z.object({ id: z.string().uuid('Transaction ID must be a valid UUID') }),
});

export const getTransactionsSchema = z.object({
  query: z.object({
    page: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().positive().max(100).optional(),
    type: z.nativeEnum(TransactionType).optional(),
    categoryId: z.string().uuid().optional(),
    startDate: dateSchema.optional(),
    endDate: dateSchema.optional(),
    sortBy: z.enum(['date', 'amount']).default('date'),
    order: z.enum(['asc', 'desc']).default('desc'),
  }),
});

export const idParamSchema = z.object({
  params: z.object({ id: z.string().uuid('Transaction ID must be a valid UUID') }),
});

export type CreateTransactionInput = z.infer<typeof createTransactionSchema>['body'];
export type UpdateTransactionInput = z.infer<typeof updateTransactionSchema>['body'];
export type GetTransactionsQuery = z.infer<typeof getTransactionsSchema>['query'];
