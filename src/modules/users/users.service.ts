import bcrypt from 'bcryptjs';
import { prisma } from '../../config/database';
import { env } from '../../config/env';
import { ConflictError, NotFoundError, UnauthorizedError } from '../../lib/errors';
import { UpdateProfileInput, ChangePasswordInput } from './users.schema';

const USER_SELECT = { id: true, email: true, name: true, createdAt: true, updatedAt: true } as const;

export async function getProfile(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: USER_SELECT });
  if (!user) throw new NotFoundError('User');
  return user;
}

export async function updateProfile(userId: string, input: UpdateProfileInput) {
  if (input.email) {
    const conflict = await prisma.user.findFirst({
      where: { email: input.email, id: { not: userId } },
    });
    if (conflict) throw new ConflictError('Email is already in use');
  }

  return prisma.user.update({
    where: { id: userId },
    data: { ...(input.name && { name: input.name }), ...(input.email && { email: input.email }) },
    select: USER_SELECT,
  });
}

export async function changePassword(userId: string, input: ChangePasswordInput): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { passwordHash: true },
  });
  if (!user) throw new NotFoundError('User');

  const valid = await bcrypt.compare(input.currentPassword, user.passwordHash);
  if (!valid) throw new UnauthorizedError('Current password is incorrect');

  const newHash = await bcrypt.hash(input.newPassword, env.BCRYPT_ROUNDS);
  await prisma.user.update({ where: { id: userId }, data: { passwordHash: newHash } });
}
