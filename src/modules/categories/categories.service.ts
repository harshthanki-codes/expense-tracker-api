import { prisma } from '../../config/database';
import { ConflictError, ForbiddenError, NotFoundError, ValidationError } from '../../lib/errors';
import { CreateCategoryInput, UpdateCategoryInput } from './categories.schema';

export async function listCategories(userId: string) {
  return prisma.category.findMany({
    where: { OR: [{ isDefault: true }, { userId }] },
    orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
    select: { id: true, name: true, isDefault: true, createdAt: true },
  });
}

export async function createCategory(userId: string, input: CreateCategoryInput) {
  const conflict = await prisma.category.findFirst({
    where: { name: { equals: input.name, mode: 'insensitive' }, userId },
  });
  if (conflict) throw new ConflictError(`You already have a category named "${input.name}"`);

  return prisma.category.create({
    data: { name: input.name, userId, isDefault: false },
    select: { id: true, name: true, isDefault: true, createdAt: true },
  });
}

export async function updateCategory(userId: string, categoryId: string, input: UpdateCategoryInput) {
  const category = await prisma.category.findUnique({ where: { id: categoryId } });
  if (!category) throw new NotFoundError('Category');
  if (category.isDefault) throw new ValidationError('Default categories cannot be modified');
  if (category.userId !== userId) throw new ForbiddenError();

  const conflict = await prisma.category.findFirst({
    where: {
      name: { equals: input.name, mode: 'insensitive' },
      userId,
      id: { not: categoryId },
    },
  });
  if (conflict) throw new ConflictError(`You already have a category named "${input.name}"`);

  return prisma.category.update({
    where: { id: categoryId },
    data: { name: input.name },
    select: { id: true, name: true, isDefault: true, createdAt: true, updatedAt: true },
  });
}

export async function deleteCategory(userId: string, categoryId: string): Promise<void> {
  const category = await prisma.category.findUnique({ where: { id: categoryId } });
  if (!category) throw new NotFoundError('Category');
  if (category.isDefault) throw new ValidationError('Default categories cannot be deleted');
  if (category.userId !== userId) throw new ForbiddenError();

  // Reassign transactions to "Other" before deleting to maintain referential integrity
  const other = await prisma.category.findFirst({
    where: { name: 'Other', isDefault: true },
  });

  if (other) {
    await prisma.transaction.updateMany({
      where: { userId, categoryId },
      data: { categoryId: other.id },
    });
  }

  await prisma.category.delete({ where: { id: categoryId } });
}
