import { Prisma } from '@prisma/client';
import { prisma } from '../../config/database';
import { ForbiddenError, NotFoundError, ValidationError } from '../../lib/errors';
import { buildPaginationMeta } from '../../lib/pagination';
import {
  CreateTransactionInput,
  UpdateTransactionInput,
  GetTransactionsQuery,
} from './transactions.schema';

const TX_SELECT = {
  id: true,
  type: true,
  amount: true,
  date: true,
  note: true,
  createdAt: true,
  updatedAt: true,
  category: { select: { id: true, name: true, isDefault: true } },
} satisfies Prisma.TransactionSelect;

export async function listTransactions(
  userId: string,
  query: GetTransactionsQuery,
  page: number,
  limit: number,
) {
  const where: Prisma.TransactionWhereInput = { userId };

  if (query.type) where.type = query.type;
  if (query.categoryId) where.categoryId = query.categoryId;
  if (query.startDate || query.endDate) {
    where.date = {
      ...(query.startDate && { gte: new Date(query.startDate) }),
      ...(query.endDate && { lte: new Date(query.endDate) }),
    };
  }

  const orderBy: Prisma.TransactionOrderByWithRelationInput =
    query.sortBy === 'amount' ? { amount: query.order } : { date: query.order };

  const [total, data] = await prisma.$transaction([
    prisma.transaction.count({ where }),
    prisma.transaction.findMany({
      where,
      orderBy,
      skip: (page - 1) * limit,
      take: limit,
      select: TX_SELECT,
    }),
  ]);

  return {
    data: data.map(serializeTransaction),
    pagination: buildPaginationMeta(total, page, limit),
  };
}

export async function getTransaction(userId: string, transactionId: string) {
  const tx = await prisma.transaction.findUnique({
    where: { id: transactionId },
    select: { ...TX_SELECT, userId: true },
  });

  if (!tx) throw new NotFoundError('Transaction');
  if (tx.userId !== userId) throw new ForbiddenError();

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { userId: _uid, ...rest } = tx;
  return serializeTransaction(rest);
}

export async function createTransaction(userId: string, input: CreateTransactionInput) {
  await assertCategoryAccessible(userId, input.categoryId);

  const tx = await prisma.transaction.create({
    data: {
      userId,
      type: input.type,
      amount: new Prisma.Decimal(input.amount),
      categoryId: input.categoryId,
      date: new Date(input.date),
      note: input.note,
    },
    select: TX_SELECT,
  });

  return serializeTransaction(tx);
}

export async function updateTransaction(
  userId: string,
  transactionId: string,
  input: UpdateTransactionInput,
) {
  const existing = await prisma.transaction.findUnique({ where: { id: transactionId } });
  if (!existing) throw new NotFoundError('Transaction');
  if (existing.userId !== userId) throw new ForbiddenError();

  if (input.categoryId) {
    await assertCategoryAccessible(userId, input.categoryId);
  }

  const tx = await prisma.transaction.update({
    where: { id: transactionId },
    data: {
      ...(input.type && { type: input.type }),
      ...(input.amount !== undefined && { amount: new Prisma.Decimal(input.amount) }),
      ...(input.categoryId && { categoryId: input.categoryId }),
      ...(input.date && { date: new Date(input.date) }),
      ...(input.note !== undefined && { note: input.note }),
    },
    select: TX_SELECT,
  });

  return serializeTransaction(tx);
}

export async function deleteTransaction(userId: string, transactionId: string): Promise<void> {
  const existing = await prisma.transaction.findUnique({ where: { id: transactionId } });
  if (!existing) throw new NotFoundError('Transaction');
  if (existing.userId !== userId) throw new ForbiddenError();

  await prisma.transaction.delete({ where: { id: transactionId } });
}

// Categories visible to a user: system defaults + their own custom categories
async function assertCategoryAccessible(userId: string, categoryId: string): Promise<void> {
  const category = await prisma.category.findUnique({ where: { id: categoryId } });
  if (!category) throw new NotFoundError('Category');
  if (!category.isDefault && category.userId !== userId) {
    throw new ValidationError('Category not accessible');
  }
}

// Decimal → number for API responses; keeps precision intact in DB
function serializeTransaction<T extends { amount: Prisma.Decimal | null }>(tx: T) {
  return { ...tx, amount: tx.amount ? parseFloat(tx.amount.toString()) : null };
}
