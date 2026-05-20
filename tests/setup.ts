import 'dotenv/config';

// Override to test database — never run tests against production DB
process.env['NODE_ENV'] = 'test';
process.env['DATABASE_URL'] = process.env['TEST_DATABASE_URL'] ?? process.env['DATABASE_URL'] ?? '';
process.env['BCRYPT_ROUNDS'] = '4'; // Fast hashing for tests
process.env['JWT_SECRET'] = 'test-secret-that-is-long-enough-for-validation-rules-here';

export default async function globalSetup() {
  console.log('🧪 Test environment initialised');
}
