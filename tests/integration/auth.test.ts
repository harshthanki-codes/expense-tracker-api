import '../setup';
import request from 'supertest';
import { createApp } from '../../src/app';
import { prisma } from '../../src/config/database';
import { redis } from '../../src/config/redis';

const app = createApp();

// These tests assume a running PostgreSQL and Redis instance (docker-compose)
// Run with: docker-compose up -d && npm run test:integration

describe('POST /api/v1/auth/register', () => {
  const email = `test-${Date.now()}@example.com`;

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email } });
    await prisma.$disconnect();
    redis.disconnect();
  });

  it('registers a new user and returns 201 with tokens', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ name: 'Test User', email, password: 'Password1' });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.tokens.accessToken).toBeTruthy();
    expect(res.body.data.user.email).toBe(email);
    // Ensure password hash is never exposed
    expect(res.body.data.user.passwordHash).toBeUndefined();
  });

  it('returns 409 when email is already taken', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ name: 'Another User', email, password: 'Password1' });

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
  });

  it('returns 400 for invalid email', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ name: 'Test', email: 'not-an-email', password: 'Password1' });

    expect(res.status).toBe(400);
    expect(res.body.details).toBeDefined();
  });

  it('returns 400 for weak password', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ name: 'Test', email: `other-${Date.now()}@example.com`, password: 'weak' });

    expect(res.status).toBe(400);
  });
});

describe('POST /api/v1/auth/login', () => {
  const email = `login-test-${Date.now()}@example.com`;

  beforeAll(async () => {
    await request(app)
      .post('/api/v1/auth/register')
      .send({ name: 'Login Test', email, password: 'Password1' });
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email } });
  });

  it('returns access and refresh tokens on valid credentials', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email, password: 'Password1' });

    expect(res.status).toBe(200);
    expect(res.body.data.tokens.accessToken).toBeTruthy();
    expect(res.body.data.tokens.refreshToken).toBeTruthy();
  });

  it('returns 401 for wrong password', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email, password: 'WrongPassword1' });

    expect(res.status).toBe(401);
  });

  it('does not leak whether the account exists', async () => {
    const resReal = await request(app)
      .post('/api/v1/auth/login')
      .send({ email, password: 'WrongPassword1' });

    const resFake = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'nobody@example.com', password: 'WrongPassword1' });

    // Both should return the same error message to prevent user enumeration
    expect(resReal.body.error).toBe(resFake.body.error);
  });
});
