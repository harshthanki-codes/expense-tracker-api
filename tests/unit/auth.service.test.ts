import '../setup';
import { ConflictError, UnauthorizedError } from '../../src/lib/errors';

// Mock external dependencies to isolate service logic
jest.mock('../../src/config/database', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
  },
}));

jest.mock('../../src/config/redis', () => ({
  redis: { get: jest.fn().mockResolvedValue(null), setex: jest.fn() },
}));

jest.mock('bcryptjs', () => ({
  hash: jest.fn().mockResolvedValue('$2a$04$hashed'),
  compare: jest.fn(),
}));

import { prisma } from '../../src/config/database';
import bcrypt from 'bcryptjs';
import * as authService from '../../src/modules/auth/auth.service';

const mockPrisma = prisma as jest.Mocked<typeof prisma>;

describe('AuthService', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('register', () => {
    it('creates a user and returns token pair', async () => {
      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(null);
      (mockPrisma.user.create as jest.Mock).mockResolvedValue({
        id: 'user-1',
        email: 'test@example.com',
        name: 'Test User',
        createdAt: new Date(),
      });

      const result = await authService.register({
        name: 'Test User',
        email: 'test@example.com',
        password: 'Password1',
      });

      expect(result.user.email).toBe('test@example.com');
      expect(result.tokens.accessToken).toBeTruthy();
      expect(result.tokens.refreshToken).toBeTruthy();
    });

    it('throws ConflictError when email already registered', async () => {
      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({ id: 'existing-user' });

      await expect(
        authService.register({ name: 'Jane', email: 'jane@example.com', password: 'Password1' }),
      ).rejects.toThrow(ConflictError);
    });
  });

  describe('login', () => {
    it('returns user and tokens on valid credentials', async () => {
      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: 'user-1',
        email: 'test@example.com',
        name: 'Test User',
        passwordHash: '$2a$04$hashed',
        createdAt: new Date(),
      });
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await authService.login({
        email: 'test@example.com',
        password: 'Password1',
      });

      expect(result.user.id).toBe('user-1');
      expect(result.tokens.accessToken).toBeTruthy();
    });

    it('throws UnauthorizedError for invalid password', async () => {
      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: 'user-1',
        email: 'test@example.com',
        passwordHash: '$2a$04$hashed',
      });
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(
        authService.login({ email: 'test@example.com', password: 'WrongPassword1' }),
      ).rejects.toThrow(UnauthorizedError);
    });

    it('throws UnauthorizedError for non-existent email', async () => {
      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(null);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(
        authService.login({ email: 'ghost@example.com', password: 'Password1' }),
      ).rejects.toThrow(UnauthorizedError);
    });
  });
});
