import test from 'node:test';
import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import mongoose from 'mongoose';
import { app } from '../src/app.js';
import { config } from '../src/config.js';
import { requireAuth } from '../src/middleware/auth.js';
import User from '../src/models/User.js';

const authHeader = () =>
  `Bearer ${jwt.sign({ sub: '000000000000000000000001' }, config.jwtSecret)}`;

test('protected dashboard rejects an invalid token', async () => {
  const response = await request(app)
    .get('/api/dashboard')
    .set('Authorization', 'Bearer invalid-token');
  assert.equal(response.status, 401);
  assert.match(response.body.error, /session has expired/i);
});

test('protected dashboard rejects a token with a malformed account id', async () => {
  const token = jwt.sign({ sub: 'not-an-object-id' }, config.jwtSecret);
  const response = await request(app).get('/api/dashboard').set('Authorization', `Bearer ${token}`);
  assert.equal(response.status, 401);
  assert.match(response.body.error, /session is invalid/i);
});

test('registration validates input before database access', async () => {
  const response = await request(app)
    .post('/api/auth/register')
    .send({ name: 'A', email: 'not-an-email', password: 'short' });
  assert.equal(response.status, 400);
  assert.match(response.body.error, /name must be between/i);
});

test('registration requires explicit early-access data consent before database access', async () => {
  const response = await request(app)
    .post('/api/auth/register')
    .send({ name: 'A Student', email: 'student@example.com', password: 'long-enough-password' });
  assert.equal(response.status, 400);
  assert.match(response.body.error, /review and accept/i);
});

test('dashboard rejects malformed years before database access', async () => {
  const response = await request(app)
    .get('/api/dashboard?year=not-a-year')
    .set('Authorization', authHeader());
  assert.equal(response.status, 400);
  assert.match(response.body.error, /valid calendar year/i);
});

test('goal and reminder settings reject invalid values before database access', async () => {
  const invalidGoal = await request(app)
    .put('/api/dashboard/goal')
    .set('Authorization', authHeader())
    .send({ dailyTarget: 1.5 });
  const invalidReminders = await request(app)
    .put('/api/dashboard/reminders')
    .set('Authorization', authHeader())
    .send({ enabled: 'yes', reminderTime: '25:00' });

  assert.equal(invalidGoal.status, 400);
  assert.match(invalidGoal.body.error, /whole number/i);
  assert.equal(invalidReminders.status, 400);
  assert.match(invalidReminders.body.error, /must be true or false/i);
});

test('provider connection validates username length before database access', async () => {
  const response = await request(app)
    .put('/api/providers/github')
    .set('Authorization', authHeader())
    .send({ username: 'a'.repeat(81) });
  assert.equal(response.status, 400);
  assert.match(response.body.error, /80 characters or fewer/i);
});

test('provider route rejects inherited object property names', async () => {
  const response = await request(app)
    .post('/api/providers/constructor/refresh')
    .set('Authorization', authHeader());
  assert.equal(response.status, 404);
  assert.equal(response.body.error, 'Unsupported provider.');
});

test('student task endpoints require authentication', async () => {
  const response = await request(app).get('/api/tasks');
  assert.equal(response.status, 401);
  assert.match(response.body.error, /sign in/i);
});

test('private activity requires authentication', async () => {
  const response = await request(app).get('/api/private-activity');
  assert.equal(response.status, 401);
  assert.match(response.body.error, /sign in/i);
});

test('private activity validates input before database access', async () => {
  const invalidDate = await request(app)
    .post('/api/private-activity')
    .set('Authorization', authHeader())
    .send({ date: '2026-02-31', type: 'coding', title: 'Private work' });
  const futureDate = await request(app)
    .post('/api/private-activity')
    .set('Authorization', authHeader())
    .send({ date: '2999-01-01', type: 'coding', title: 'Private work' });
  const invalidType = await request(app)
    .post('/api/private-activity')
    .set('Authorization', authHeader())
    .send({ date: '2026-01-01', type: 'public', title: 'Private work' });
  const blankTitle = await request(app)
    .post('/api/private-activity')
    .set('Authorization', authHeader())
    .send({ date: '2026-01-01', type: 'coding', title: ' ' });
  const invalidId = await request(app)
    .delete('/api/private-activity/not-an-id')
    .set('Authorization', authHeader());

  assert.equal(invalidDate.status, 400);
  assert.equal(futureDate.status, 400);
  assert.equal(invalidType.status, 400);
  assert.equal(blankTitle.status, 400);
  assert.equal(invalidId.status, 400);
});

test('account export requires authentication and account deletion requires a current password', async () => {
  const [exportResponse, deleteResponse] = await Promise.all([
    request(app).get('/api/account/export'),
    request(app).delete('/api/account').set('Authorization', authHeader()).send({}),
  ]);
  assert.equal(exportResponse.status, 401);
  assert.match(exportResponse.body.error, /sign in/i);
  assert.equal(deleteResponse.status, 400);
  assert.match(deleteResponse.body.error, /current password/i);
});

test('student task routes validate dates, types, and identifiers before database access', async () => {
  const invalidDate = await request(app)
    .post('/api/tasks')
    .set('Authorization', authHeader())
    .send({ title: 'Study', type: 'study', dueDate: '2026-02-31' });
  const invalidType = await request(app)
    .post('/api/tasks')
    .set('Authorization', authHeader())
    .send({ title: 'Study', type: 'other', dueDate: '' });
  const invalidId = await request(app)
    .patch('/api/tasks/not-an-id')
    .set('Authorization', authHeader())
    .send({ completed: true });

  assert.equal(invalidDate.status, 400);
  assert.match(invalidDate.body.error, /valid due date/i);
  assert.equal(invalidType.status, 400);
  assert.match(invalidType.body.error, /task type/i);
  assert.equal(invalidId.status, 400);
  assert.match(invalidId.body.error, /task id/i);
});

test('uploaded badge endpoints require authentication', async () => {
  const [list, gallery, image] = await Promise.all([
    request(app).get('/api/badges'),
    request(app).get('/api/badges/gallery'),
    request(app).get('/api/badges/000000000000000000000001/image'),
  ]);
  assert.equal(list.status, 401);
  assert.match(list.body.error, /sign in/i);
  assert.equal(gallery.status, 401);
  assert.match(gallery.body.error, /sign in/i);
  assert.equal(image.status, 401);
  assert.match(image.body.error, /sign in/i);
});

test('uploaded badge image route validates identifiers before database access', async () => {
  const response = await request(app)
    .get('/api/badges/not-an-id/image')
    .set('Authorization', authHeader());
  assert.equal(response.status, 400);
  assert.match(response.body.error, /badge id is invalid/i);
});

test('uploaded badge route validates metadata and image types before database access', async () => {
  const invalidTitle = await request(app)
    .post('/api/badges')
    .set('Authorization', authHeader())
    .send({
      title: ' ',
      platform: 'HackerRank',
      imageType: 'image/png',
      imageData: 'data:image/png;base64,abc',
    });
  const invalidImage = await request(app)
    .post('/api/badges')
    .set('Authorization', authHeader())
    .send({
      title: 'Gold',
      platform: 'HackerRank',
      imageType: 'image/svg+xml',
      imageData: 'data:image/svg+xml;base64,abc',
    });
  const mismatchedImage = await request(app)
    .post('/api/badges')
    .set('Authorization', authHeader())
    .send({
      title: 'Gold',
      platform: 'HackerRank',
      imageType: 'image/png',
      imageData: 'data:image/png;base64,aGVsbG8=',
    });

  assert.equal(invalidTitle.status, 400);
  assert.match(invalidTitle.body.error, /badge name/i);
  assert.equal(invalidImage.status, 400);
  assert.match(invalidImage.body.error, /PNG, JPEG, or WebP/i);
  assert.equal(mismatchedImage.status, 400);
  assert.match(mismatchedImage.body.error, /content does not match/i);
});

test('public badge API rejects malformed gallery and badge identifiers without authentication', async () => {
  const [gallery, image] = await Promise.all([
    request(app).get('/api/public/badges/not-a-gallery-key'),
    request(app).get('/api/public/badges/not-a-gallery-key/not-an-id/image'),
  ]);
  assert.equal(gallery.status, 404);
  assert.equal(image.status, 404);
});

test('requireAuth rejects tokens issued before password was changed', async () => {
  const userId = new mongoose.Types.ObjectId().toString();
  const token = jwt.sign({ sub: userId, iat: 1000 }, config.jwtSecret);
  const req = {
    get: (name) => (name.toLowerCase() === 'authorization' ? `Bearer ${token}` : null),
  };
  let statusCode = null;
  let jsonResult = null;
  const res = {
    status(code) {
      statusCode = code;
      return this;
    },
    json(body) {
      jsonResult = body;
      return this;
    },
  };

  const originalFindById = User.findById;
  User.findById = () => ({
    select: async () => ({
      _id: userId,
      passwordChangedAt: new Date(2000 * 1000),
    }),
  });

  const originalReadyState = mongoose.connection.readyState;
  Object.defineProperty(mongoose.connection, 'readyState', { value: 1, configurable: true });

  try {
    let nextCalled = false;
    await requireAuth(req, res, () => {
      nextCalled = true;
    });
    assert.equal(nextCalled, false);
    assert.equal(statusCode, 401);
    assert.match(jsonResult.error, /password was changed/i);
  } finally {
    User.findById = originalFindById;
    Object.defineProperty(mongoose.connection, 'readyState', {
      value: originalReadyState,
      configurable: true,
    });
  }
});
