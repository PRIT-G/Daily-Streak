import { useMemo } from 'react';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export default function Heatmap({ activity = [], year, target, source, sourceLabel = 'activity' }) {
  const { weeks, labels, totalDays } = useMemo(() => {
    const lookup = new Map(activity.map((day) => [day.date, day]));
    const start = new Date(Date.UTC(year, 0, 1));
    const finish = new Date(Date.UTC(year, 11, 31));
    const first = new Date(start);
    first.setUTCDate(first.getUTCDate() - ((first.getUTCDay() + 6) % 7));
    const allWeeks = [];
    const monthLabels = [];
    let activeDays = 0;
    let monthFound = new Set();
    for (let cursor = new Date(first); cursor <= finish; cursor.setUTCDate(cursor.getUTCDate() + 7)) {
      const week = [];
      for (let offset = 0; offset < 7; offset += 1) {
        const date = new Date(cursor);
        date.setUTCDate(date.getUTCDate() + offset);
        const dateKey = date.toISOString().slice(0, 10);
        const record = date >= start && date <= finish ? lookup.get(dateKey) : undefined;
        const count = source
          ? Number(record?.sources?.[source] ?? record?.[source] ?? 0)
          : record?.total || 0;
        const isFuture = date > new Date();
        if (count >= target && !isFuture) activeDays += 1;
        if (date.getUTCDate() <= 7 && !monthFound.has(date.getUTCMonth())) {
          monthLabels.push({ week: allWeeks.length, label: MONTHS[date.getUTCMonth()] });
          monthFound.add(date.getUTCMonth());
        }
        week.push({ dateKey, count, isFuture, inYear: date >= start && date <= finish });
      }
      allWeeks.push(week);
    }
    return { weeks: allWeeks, labels: monthLabels, totalDays: activeDays };
  }, [activity, year, target]);

  const weekdayPatterns = useMemo(() => {
    if (source) return null;
    const stats = Array.from({ length: 7 }, () => ({ hits: 0, total: 0 }));
    for (const day of activity) {
      if (!day.date) continue;
      const weekday = (new Date(`${day.date}T00:00:00.000Z`).getUTCDay() + 6) % 7; // Mon=0
      stats[weekday].total += 1;
      if ((day.total || 0) >= target) stats[weekday].hits += 1;
    }
    const scored = stats
      .map((stat, index) => ({ ...stat, weekday: index, rate: stat.total ? stat.hits / stat.total : 0 }))
      .filter((stat) => stat.total >= 3);
    if (!scored.length) return null;
    const best = scored.reduce((a, b) => (b.rate > a.rate ? b : a));
    const worst = scored.reduce((a, b) => (b.rate < a.rate ? b : a));
    if (best.weekday === worst.weekday) return null;
    return { best, worst };
  }, [activity, source, target]);

  return (
    <div className="heatmap-wrap">
      <div className="month-labels" aria-hidden="true">
        {labels.map((month) => <span key={month.label} style={{ gridColumn: month.week + 1 }}>{month.label}</span>)}
      </div>
      <div className="heatmap-layout">
        <div className="weekday-labels" aria-hidden="true">{DAYS.map((day, index) => <span key={day}>{index % 2 === 0 ? day : ''}</span>)}</div>
        <div className={`heatmap-grid${source ? ` source-heatmap source-heatmap-${source}` : ''}`} role="grid" aria-label={`${year} ${sourceLabel} activity calendar, ${totalDays} goal days`}>
          {weeks.map((week, weekIndex) => (
            <div className="heatmap-week" role="row" key={weekIndex}>
              {week.map((day, dayIndex) => {
                const level = day.count === 0 ? 0 : day.count >= target * 2 ? 4 : day.count >= target ? 3 : 1;
                return (
                  <span
                    className={`heat-cell level-${level}${day.isFuture || !day.inYear ? ' is-future' : ''}`}
                    role="gridcell"
                    key={day.dateKey}
                    title={`${day.dateKey}: ${day.count} ${sourceLabel} ${day.count === 1 ? 'activity' : 'activities'}`}
                    aria-label={`${DAYS[dayIndex]} ${day.dateKey}: ${day.count} activity${day.count === 1 ? '' : ' items'}`}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>
      <div className="heatmap-footer">
        <span>{totalDays} days hit your goal</span>
        <div className="legend"><span>Less</span>{[0, 1, 2, 3, 4].map((level) => <i className={`heat-cell level-${level}`} key={level} />)}<span>More</span></div>
      </div>
      {weekdayPatterns && (
        <div className="weekday-patterns" aria-label="Weekday activity patterns">
          <span className="weekday-pattern best">Strongest: {DAYS[weekdayPatterns.best.weekday]}s ({Math.round(weekdayPatterns.best.rate * 100)}% goal days)</span>
          <span className="weekday-pattern weak">Weakest: {DAYS[weekdayPatterns.worst.weekday]}s ({Math.round(weekdayPatterns.worst.rate * 100)}% goal days)</span>
        </div>
      )}
    </div>
  );
}
