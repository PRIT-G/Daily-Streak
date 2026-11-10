import test from 'node:test';
import assert from 'node:assert/strict';
import { config } from '../src/config.js';
import { createOAuthState, decryptToken, encryptToken, verifyOAuthState } from '../src/services/integrationSecurity.js';

test('OAuth credentials round-trip through authenticated encryption', () => {
  const previousKey = config.integrations.encryptionKey;
  config.integrations.encryptionKey = '1'.repeat(64);
  try {
    const encrypted = encryptToken('provider-access-token');
    assert.notEqual(encrypted, 'provider-access-token');
    assert.equal(decryptToken(encrypted), 'provider-access-token');
    const parts = encrypted.split('.');
    parts[2] = `${parts[2][0] === 'A' ? 'B' : 'A'}${parts[2].slice(1)}`;
    assert.throws(() => decryptToken(parts.join('.')));
  } finally {
    config.integrations.encryptionKey = previousKey;
  }
});

test('OAuth state is signed, short-lived, and bound to its provider', () => {
  const state = createOAuthState('000000000000000000000001', 'jira');
  assert.equal(verifyOAuthState(state, 'jira'), '000000000000000000000001');
  assert.throws(() => verifyOAuthState(state, 'notion'), /invalid/i);
});
