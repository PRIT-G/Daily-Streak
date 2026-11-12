import { createCipheriv, createDecipheriv, randomBytes, randomUUID } from 'node:crypto';
import jwt from 'jsonwebtoken';
import { config } from '../config.js';

const STATE_ISSUER = 'daily-streak-integrations';

function encryptionKey() {
  const key = config.integrations.encryptionKey;
  if (!/^[a-f\d]{64}$/i.test(key)) {
    const error = new Error(
      'Server integrations are not configured. Set a 32-byte hex integration encryption key.'
    );
    error.status = 503;
    throw error;
  }
  return Buffer.from(key, 'hex');
}

export function encryptToken(value) {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', encryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  return [iv, cipher.getAuthTag(), encrypted].map((part) => part.toString('base64url')).join('.');
}

export function decryptToken(value) {
  const [ivPart, tagPart, encryptedPart] = String(value).split('.');
  if (!ivPart || !tagPart || !encryptedPart)
    throw new Error('Stored provider credential is invalid.');
  const decipher = createDecipheriv(
    'aes-256-gcm',
    encryptionKey(),
    Buffer.from(ivPart, 'base64url')
  );
  decipher.setAuthTag(Buffer.from(tagPart, 'base64url'));
  return Buffer.concat([
    decipher.update(Buffer.from(encryptedPart, 'base64url')),
    decipher.final(),
  ]).toString('utf8');
}

export function createOAuthState(userId, provider, claims = {}) {
  return jwt.sign(
    { ...claims, sub: userId, provider, purpose: 'integration-oauth', jti: randomUUID() },
    config.jwtSecret,
    {
      issuer: STATE_ISSUER,
      expiresIn: '10m',
    }
  );
}

export function verifyOAuthStateClaims(state, provider) {
  const payload = jwt.verify(state, config.jwtSecret, { issuer: STATE_ISSUER });
  if (
    typeof payload !== 'object' ||
    typeof payload.sub !== 'string' ||
    payload.provider !== provider ||
    payload.purpose !== 'integration-oauth'
  ) {
    throw new Error('OAuth state is invalid.');
  }
  return { userId: payload.sub, claims: payload };
}

export function verifyOAuthState(state, provider) {
  return verifyOAuthStateClaims(state, provider).userId;
}
