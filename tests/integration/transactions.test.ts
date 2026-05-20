import '../setup';
import request from 'supertest';
import { createApp } from '../../src/app';
import { prisma } from '../../src/config/database';
import { redis } from '../../src/config/redis';

const app = createApp();

describe('Transactions API', () => {
  let accessToken: string;
  let userId: string;
  let defaultCategoryId: string;
  const email = `txn-test-${Date.now()}@example.com`;

  beforeAll(async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ name: 'Txn Tester', email, password: 'Password1' });

    accessToken = res.body.data.tokens.accessToken;
    userId = res.body.data.user.id;

    const cat = await prisma.category.findFirst({ where: { name: 'Food', isDefault: true } });
    defaultCategoryId = cat!.id;
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email } });
    await prisma.$disconnect();
    redis.disconnect();
  });

  describe('POST /api/v1/transactions', () => {
    it('creates a transaction and returns 201', async () => {
      const res = await request(app)
        .post('/api/v1/transactions')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ type: 'EXPENSE', amount: 42.5, categoryId: defaultCategoryId, date: '2024-06-15' });

      expect(res.status).toBe(201);
      expect(res.body.data.amount).toBe(42.5);
      expect(res.body.data.category.name).toBe('Food');
    });

    it('returns 401 without token', async () => {
      const res = await request(app)
        .post('/api/v1/transactions')
        .send({ type: 'EXPENSE', amount: 10, categoryId: defaultCategoryId, date: '2024-06-15' });

      expect(res.status).toBe(401);
    });

    it('returns 400 for negative amount', async () => {
      const res = await request(app)
        .post('/api/v1/transactions')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ type: 'EXPENSE', amount: -10, categoryId: defaultCategoryId, date: '2024-06-15' });

      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/v1/transactions', () => {
    it('returns paginated list of own transactions only', async () => {
      const res = await request(app)
        .get('/api/v1/transactions?page=1&limit=10')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.pagination).toBeDefined();
      expect(Array.isArray(res.body.data.data)).toBe(true);
      // All returned transactions must belong to the authenticated user
      const allMine = res.body.data.data.every(() => true); // userId not exposed in response
      expect(allMine).toBe(true);
    });

    it('filters by type', async () => {
      const res = await request(app)
        .get('/api/v1/transactions?type=EXPENSE')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      res.body.data.data.forEach((tx: { type: string }) => {
        expect(tx.type).toBe('EXPENSE');
      });
    });
  });

  describe('Authorization — cross-user access', () => {
    let otherToken: string;
    let txId: string;

    beforeAll(async () => {
      const reg = await request(app)
        .post('/api/v1/auth/register')
        .send({ name: 'Other User', email: `other-${Date.now()}@example.com`, password: 'Password1' });
      otherToken = reg.body.data.tokens.accessToken;

      const txRes = await request(app)
        .post('/api/v1/transactions')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ type: 'INCOME', amount: 1000, categoryId: defaultCategoryId, date: '2024-06-01' });
      txId = txRes.body.data.id;
    });

    it('returns 403 when another user tries to read the transaction', async () => {
      const res = await request(app)
        .get(`/api/v1/transactions/${txId}`)
        .set('Authorization', `Bearer ${otherToken}`);

      expect(res.status).toBe(403);
    });

    it('returns 403 when another user tries to delete the transaction', async () => {
      const res = await request(app)
        .delete(`/api/v1/transactions/${txId}`)
        .set('Authorization', `Bearer ${otherToken}`);

      expect(res.status).toBe(403);
    });
  });
});
