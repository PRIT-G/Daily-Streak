import test from 'node:test';
import assert from 'node:assert/strict';
import { reminderText } from '../src/services/reminders.js';

test('reminder email asks for the remaining activity with correct singular grammar', () => {
  assert.match(reminderText('Ari', 1), /Complete 1 more activity item today/);
  assert.match(reminderText('Ari', 3), /Complete 3 more activity items today/);
});
