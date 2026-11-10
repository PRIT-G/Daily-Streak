import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const serverDirectory = fileURLToPath(new URL('../', import.meta.url));

function loadProductionConfig(smtpConfigured) {
  const env = {
    ...process.env,
    NODE_ENV: 'production',
    JWT_SECRET: 'a'.repeat(48),
    SMTP_HOST: smtpConfigured ? 'smtp.example.com' : '',
    SMTP_USER: smtpConfigured ? 'daily-streak@example.com' : '',
    SMTP_PASS: smtpConfigured ? 'test-password' : '',
    INTEGRATION_TOKEN_ENCRYPTION_KEY: '',
    INTEGRATION_ADMIN_SECRET: '',
    GITHUB_CLIENT_ID: '',
    GITHUB_CLIENT_SECRET: '',
    JIRA_CLIENT_ID: '',
    JIRA_CLIENT_SECRET: '',
    NOTION_CLIENT_ID: '',
    NOTION_CLIENT_SECRET: '',
  };
  return spawnSync(
    process.execPath,
    ['--input-type=module', '-e', "await import('./src/config.js')"],
    {
      cwd: serverDirectory,
      env,
      encoding: 'utf8',
    }
  );
}

test('production config requires SMTP for account email', () => {
  const result = loadProductionConfig(false);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Production requires SMTP_HOST, SMTP_USER, and SMTP_PASS/);
});

test('production config loads when SMTP is configured', () => {
  const result = loadProductionConfig(true);
  assert.equal(result.status, 0, result.stderr);
});
