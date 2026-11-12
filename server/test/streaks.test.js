import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateStreaks, dayTotal } from '../src/utils/streaks.js';

test('calculates current and longest streak including activity today', () => {
  const days = [
    { date: '2025-03-01', github: 2 },
    { date: '2025-03-02', leetcode: 1 },
    { date: '2025-03-03', manual: 1 },
    { date: '2025-03-05', github: 1 },
    { date: '2025-03-06', github: 1 },
  ];
  assert.deepEqual(calculateStreaks(days, 1, new Date('2025-03-06T12:00:00Z')), {
    current: 2,
    longest: 3,
  });
});

test('current streak continues from yesterday when today has no activity', () => {
  const days = [
    { date: '2025-03-04', github: 1 },
    { date: '2025-03-05', github: 1 },
  ];
  assert.deepEqual(calculateStreaks(days, 1, new Date('2025-03-06T12:00:00Z')), {
    current: 2,
    longest: 2,
  });
});

test('daily target combines provider activity and breaks streaks below target', () => {
  const days = [
    { date: '2025-03-04', github: 1 },
    { date: '2025-03-05', github: 1, leetcode: 1 },
    { date: '2025-03-06', manual: 1 },
  ];
  assert.deepEqual(calculateStreaks(days, 2, new Date('2025-03-06T12:00:00Z')), {
    current: 1,
    longest: 1,
  });
});

test('handles empty days and ignores negative counts', () => {
  assert.equal(dayTotal({ github: -3, leetcode: 2, manual: 1 }), 3);
  assert.deepEqual(calculateStreaks([], 1, new Date('2025-03-06T12:00:00Z')), {
    current: 0,
    longest: 0,
  });
});

test('covered dates bridge missed days for streak freeze', () => {
  const days = [
    { date: '2025-03-04', github: 1 },
    { date: '2025-03-06', github: 1 },
  ];
  // Without coverage: streak breaks at 03-05.
  assert.deepEqual(calculateStreaks(days, 1, new Date('2025-03-06T12:00:00Z')), {
    current: 1,
    longest: 1,
  });
  // With 03-05 covered: current streak spans both days.
  assert.deepEqual(calculateStreaks(days, 1, new Date('2025-03-06T12:00:00Z'), ['2025-03-05']), {
    current: 3,
    longest: 3,
  });
});

test('covered dates count toward longest streak even without activity records', () => {
  const days = [{ date: '2025-03-01', github: 1 }];
  assert.deepEqual(
    calculateStreaks(days, 1, new Date('2025-03-03T12:00:00Z'), ['2025-03-02', '2025-03-03']),
    { current: 3, longest: 3 }
  );
});

test('supports extensible source counts and legacy provider fields', () => {
  assert.equal(
    dayTotal({
      github: 3,
      leetcode: 2,
      sources: { github: 4, jira: 5 },
    }),
    11
  );
  assert.equal(
    dayTotal({
      sources: new Map([
        ['slack', 2],
        ['docker', 3],
      ]),
    }),
    5
  );
});
