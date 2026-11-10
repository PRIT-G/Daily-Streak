import test from 'node:test';
import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import { app } from '../src/app.js';
import { config } from '../src/config.js';

test('health endpoint responds without a database connection', async () => {
  const response = await request(app).get('/api/health');
  assert.equal(response.status, 200);
  assert.equal(response.body.status, 'ok');
  assert.equal(response.body.database.connected, false);
  assert.equal(response.body.database.state, 'disconnected');
});

test('protected dashboard rejects an anonymous request', async () => {
  const response = await request(app).get('/api/dashboard');
  assert.equal(response.status, 401);
  assert.match(response.body.error, /sign in/i);
});

test('unknown paths return a JSON 404', async () => {
  const response = await request(app).get('/api/not-a-route');
  assert.equal(response.status, 404);
  assert.equal(response.body.error, 'Route not found.');
});

test('unsupported provider names fail clearly before database access', async () => {
  const token = jwt.sign({ sub: '000000000000000000000001' }, config.jwtSecret);
  const response = await request(app).post('/api/providers/not-a-provider/refresh')
    .set('Authorization', `Bearer ${token}`);
  assert.equal(response.status, 404);
  assert.equal(response.body.error, 'Unsupported provider.');
});
