import { ArrowUpRight } from 'lucide-react';
import ActivitySourceChart from './ActivitySourceChart.jsx';

export function ActivityPanel({ dashboard, year, onYearChange }) {
  const providers = [
    ...Object.entries(dashboard.providers || {}),
    ['manual', { username: 'Private activity entries' }]
  ];

  return (
    <article className="panel activity-panel" id="activity">
      <div className="panel-heading">
        <div><div className="panel-kicker">A YEAR OF SHOWING UP</div><h2>Activity by source</h2><p>Each connection has its own calendar and contribution total.</p></div>
        <label className="year-selector">
          <select className="year-pill" aria-label="Activity calendar year" value={year} onChange={(event) => onYearChange(Number(event.target.value))}>
            {Array.from({ length: 5 }, (_, index) => {
              const availableYear = new Date().getUTCFullYear() - index;
              return <option key={availableYear} value={availableYear}>{availableYear}</option>;
            })}
          </select>
        </label>
      </div>
      <div className="activity-source-list">
        {providers.map(([provider, connection]) => (
          <ActivitySourceChart
            key={provider}
            activity={dashboard.activity}
            provider={provider}
            connection={connection}
            year={year}
            target={dashboard.goal.dailyTarget}
          />
        ))}
      </div>
    </article>
  );
}

export function GoalPanel({ dashboard, todayCount, todayGoalMet, onOpenSettings }) {
  const remaining = Math.max(0, dashboard.goal.dailyTarget - todayCount);
  const progress = Math.min(100, Math.round((todayCount / dashboard.goal.dailyTarget) * 100));

  return (
    <article className="panel goal-panel">
      <div className="panel-kicker">THE NEXT SMALL STEP</div><h2>Today’s intention</h2>
      <div className="goal-visual"><div className="goal-ring" style={{ '--progress': `${progress}%` }}><div><strong>{progress}%</strong><small>there</small></div></div></div>
      <div className="goal-summary">
        <strong>{todayGoalMet ? 'You made it happen.' : todayCount ? 'You’re finding your rhythm.' : 'A fresh day is yours.'}</strong>
        <p>{todayGoalMet ? 'Your goal is in the books for today.' : `${remaining} activity ${remaining === 1 ? 'item' : 'items'} to reach your daily goal.`}</p>
      </div>
      <button className="text-button" onClick={onOpenSettings}>Adjust your daily goal <ArrowUpRight size={15} /></button>
    </article>
  );
}
