const MILESTONES = [
  { id: 'first-step', title: 'First step', description: 'Reach your daily goal for the first time.', check: (_, days) => days >= 1 },
  { id: 'week-on-fire', title: 'Week on fire', description: 'Build a 7-day streak.', check: (streaks) => streaks.longest >= 7 },
  { id: 'two-weeks', title: 'Two-week rhythm', description: 'Build a 14-day streak.', check: (streaks) => streaks.longest >= 14 },
  { id: 'month-maker', title: 'Month maker', description: 'Build a 30-day streak.', check: (streaks) => streaks.longest >= 30 },
  { id: 'hundred-club', title: 'Hundred club', description: 'Log activity on 100 days.', check: (_, days) => days >= 100 }
];

export function awardBadges(existing, streaks, qualifiedDays, now = new Date()) {
  const awarded = new Map(existing.map((badge) => [badge.id, badge]));
  for (const milestone of MILESTONES) {
    if (!awarded.has(milestone.id) && milestone.check(streaks, qualifiedDays)) {
      awarded.set(milestone.id, {
        id: milestone.id,
        title: milestone.title,
        description: milestone.description,
        earnedAt: now
      });
    }
  }
  return [...awarded.values()];
}
