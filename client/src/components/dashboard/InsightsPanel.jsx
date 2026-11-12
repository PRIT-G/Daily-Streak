import {
  ArrowDownRight,
  ArrowUpRight,
  BrainCircuit,
  CalendarDays,
  Flame,
  Lightbulb,
  ShieldCheck,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Trophy,
} from 'lucide-react';

const SOURCE_LABELS = {
  github: 'GitHub',
  leetcode: 'LeetCode',
  codeforces: 'Codeforces',
  gitlab: 'GitLab',
  manual: 'Manual',
  jira: 'Jira',
  notion: 'Notion',
};

function sourceLabel(id) {
  return SOURCE_LABELS[id] || id.charAt(0).toUpperCase() + id.slice(1);
}

function formatDate(dateKey) {
  if (!dateKey) return '—';
  return new Date(`${dateKey}T00:00:00.000Z`).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

export default function InsightsPanel({ insights, dashboard }) {
  if (!insights) return null;
  const {
    consistencyScore,
    activeDays,
    goalDays,
    averageDailyActivity,
    bestDay,
    busiestSource,
    weekComparison,
    streak,
    nextMilestone,
    prediction,
    anomaly,
    goalSuggestion,
    recommendations,
    dataQuality,
  } = insights;
  const weekDelta = weekComparison.thisWeek - weekComparison.lastWeek;

  return (
    <section className="insights-panel" aria-label="Streak insights">
      <div className="panel-heading">
        <div>
          <span className="panel-kicker">INTELLIGENCE</span>
          <h2>Streak insights</h2>
          <p>Patterns from your last {insights.windowDays} days, computed on your account data.</p>
        </div>
        <span className="stat-tag neutral">
          <BrainCircuit size={13} /> ANALYZED
        </span>
      </div>

      <div className="insights-score-row">
        <div className="insight-score">
          <div className="insight-score-ring" style={{ '--score': `${consistencyScore}%` }}>
            <strong>
              {consistencyScore}
              <small>%</small>
            </strong>
          </div>
          <div>
            <span className="insight-score-label">Consistency score</span>
            <span className="insight-score-sub">
              Goal met on {goalDays} of {insights.windowDays} days · {activeDays} active
            </span>
          </div>
        </div>
        <div className="insight-metrics">
          <div className="insight-metric">
            <TrendingUp size={15} />
            <div>
              <strong>{averageDailyActivity}</strong>
              <span>avg activity / day</span>
            </div>
          </div>
          <div className="insight-metric">
            <Flame size={15} />
            <div>
              <strong>{bestDay ? bestDay.total : 0}</strong>
              <span>{bestDay ? `best day · ${formatDate(bestDay.date)}` : 'no activity yet'}</span>
            </div>
          </div>
          <div className="insight-metric">
            <CalendarDays size={15} />
            <div>
              <strong>
                {weekComparison.thisWeek}
                <small>/{weekComparison.lastWeek}</small>
              </strong>
              <span>
                this vs last week{' '}
                {weekDelta > 0 && (
                  <em className="insight-delta up">
                    <ArrowUpRight size={11} /> {weekDelta}
                  </em>
                )}
                {weekDelta < 0 && (
                  <em className="insight-delta down">
                    <ArrowDownRight size={11} /> {Math.abs(weekDelta)}
                  </em>
                )}
                {weekDelta === 0 && <em className="insight-delta flat">even</em>}
              </span>
            </div>
          </div>
        </div>
      </div>

      {anomaly?.detected && (
        <div className={`insight-anomaly ${anomaly.direction}`} role="status">
          {anomaly.direction === 'down' ? <TrendingDown size={15} /> : <TrendingUp size={15} />}
          <span>{anomaly.message}</span>
        </div>
      )}

      <div className="insights-lower-grid">
        <div className="insights-block">
          <h3>
            <Sparkles size={14} /> Top sources
          </h3>
          {busiestSource.length ? (
            <ul className="insight-source-list">
              {busiestSource.map((source) => (
                <li key={source.id}>
                  <span>{sourceLabel(source.id)}</span>
                  <span className="insight-source-bar">
                    <i style={{ width: `${Math.min(100, source.count)}%` }} />
                  </span>
                  <strong>{source.count}</strong>
                </li>
              ))}
            </ul>
          ) : (
            <p className="insight-empty">No synced activity in this window yet.</p>
          )}
        </div>

        <div className="insights-block">
          <h3>
            <Trophy size={14} /> Next milestone
          </h3>
          {nextMilestone ? (
            <p className="insight-milestone">
              <strong>{nextMilestone.title}</strong> — {nextMilestone.daysRemaining} day
              {nextMilestone.daysRemaining === 1 ? '' : 's'} to go on your longest streak (
              {dashboard.streaks.longest}).
            </p>
          ) : (
            <p className="insight-milestone">
              <strong>All streak milestones earned.</strong> Keep the rhythm going.
            </p>
          )}
          {streak.atRisk && (
            <p className="insight-risk">
              <ShieldCheck size={13} /> Your {streak.current}-day streak is at risk — log activity
              today.
            </p>
          )}
        </div>

        <div className="insights-block">
          <h3>
            <TrendingUp size={14} /> Forecast
          </h3>
          {prediction?.forecasts?.length ? (
            <ul className="insight-forecast-list">
              {prediction.forecasts.map((item) => (
                <li key={item.streakDays}>
                  <strong>{item.streakDays}-day streak</strong>
                  <span>
                    {item.daysNeeded}d · ~{item.estimatedDateLabel}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="insight-empty">Not enough history to forecast yet.</p>
          )}
          {prediction && (
            <p className="insight-forecast-meta">
              Trend: <strong>{prediction.trend}</strong> · 14-day avg{' '}
              {prediction.recentDailyAverage}/day
            </p>
          )}
        </div>

        {goalSuggestion && (
          <div className="insights-block insights-block-wide">
            <h3>
              <Lightbulb size={14} /> Goal suggestion
            </h3>
            <p className="insight-milestone">
              {goalSuggestion.message} Based on {goalSuggestion.activeDays} active days: hitting{' '}
              {goalSuggestion.currentTarget}/day {goalSuggestion.currentHitRate}% of the time vs{' '}
              {goalSuggestion.suggestedHitRate}% at {goalSuggestion.suggestedTarget}/day.
            </p>
          </div>
        )}

        <div className="insights-block insights-block-wide">
          <h3>
            <Lightbulb size={14} /> Recommendations
          </h3>
          {recommendations.length ? (
            <ul className="insight-recommendations">
              {recommendations.map((item) => (
                <li key={item.id}>{item.text}</li>
              ))}
            </ul>
          ) : (
            <p className="insight-empty">
              You’re on a great trajectory — nothing to fix right now.
            </p>
          )}
        </div>

        <div className="insights-block">
          <h3>
            <ShieldCheck size={14} /> Data quality
          </h3>
          <p className="insight-quality">
            {dataQuality.connectedProviders} provider
            {dataQuality.connectedProviders === 1 ? '' : 's'} connected.
            {dataQuality.staleProviders.length > 0 && (
              <>
                {' '}
                <strong className="insight-stale">
                  {dataQuality.staleProviders.map(sourceLabel).join(', ')}{' '}
                  {dataQuality.staleProviders.length === 1 ? 'has' : 'have'} not synced in over 7
                  days
                </strong>{' '}
                — refresh from the Activity page.
              </>
            )}
          </p>
        </div>
      </div>
    </section>
  );
}
