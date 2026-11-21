const request = require('supertest');
const bcrypt = require('bcrypt');
const app = require('../src/app');
const pool = require('../src/db');

const PASSWORD = 'TestPass123!';
const aliceEmail = `test-alice-${Date.now()}@example.com`;
const bobEmail = `test-bob-${Date.now()}@example.com`;

let aliceToken;
let bobToken;
let inquiry;

// Create a temporary user directly in the DB, then log in through the real API
async function createUser(email, name) {
  const hash = await bcrypt.hash(PASSWORD, 4);
  await pool.query(
    'INSERT INTO users (email, name, password_hash) VALUES ($1, $2, $3)',
    [email, name, hash]
  );
  const res = await request(app)
    .post('/api/auth/login')
    .send({ email, password: PASSWORD });
  return res.body.token;
}

beforeAll(async () => {
  aliceToken = await createUser(aliceEmail, 'Test Alice');
  bobToken = await createUser(bobEmail, 'Test Bob');

  const res = await request(app)
    .post('/api/inquiries')
    .set('Authorization', `Bearer ${aliceToken}`)
    .send({
      customer_name: 'Test Customer',
      customer_contact: '0770000000',
      subject: 'Test subject',
      description: 'Test description',
    });
  inquiry = res.body.inquiry;
});

afterAll(async () => {
  // Clean up everything the tests created
  await pool.query(
    'DELETE FROM inquiries WHERE owner_id IN (SELECT id FROM users WHERE email IN ($1, $2))',
    [aliceEmail, bobEmail]
  );
  await pool.query('DELETE FROM users WHERE email IN ($1, $2)', [aliceEmail, bobEmail]);
  await pool.end();
});

describe('inquiry business rules', () => {
  it('rejects requests without a token (401)', async () => {
    const res = await request(app).get('/api/inquiries');
    expect(res.status).toBe(401);
  });

  it('rejects an invalid status transition (New -> Resolved) with 422', async () => {
    const res = await request(app)
      .patch(`/api/inquiries/${inquiry.id}/status`)
      .set('Authorization', `Bearer ${aliceToken}`)
      .send({ status: 'Resolved', updated_at: inquiry.updated_at });

    expect(res.status).toBe(422);
    expect(res.body.allowed).toEqual(['In Progress']);
  });

  it("hides another user's inquiry (404, not 403)", async () => {
    const res = await request(app)
      .get(`/api/inquiries/${inquiry.id}`)
      .set('Authorization', `Bearer ${bobToken}`);

    expect(res.status).toBe(404);
  });

  it('rejects a stale update with 409', async () => {
    const res = await request(app)
      .patch(`/api/inquiries/${inquiry.id}/status`)
      .set('Authorization', `Bearer ${aliceToken}`)
      .send({ status: 'In Progress', updated_at: '2000-01-01T00:00:00.000Z' });

    expect(res.status).toBe(409);
  });
});