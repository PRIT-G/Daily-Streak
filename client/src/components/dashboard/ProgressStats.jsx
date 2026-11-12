import {
  ArrowDownRight,
  ArrowUpRight,
  CalendarDays,
  Check,
  Flame,
  Target,
  Trophy,
} from 'lucide-react';

export default function ProgressStats({ dashboard, todayCount, todayGoalMet }) {
  return (
    <section className="stats-grid" aria-label="Your progress">
      <article className="stat-card streak-card">
        <div className="stat-top">
          <span className="stat-icon flame-icon">
            <Flame size={18} fill="currentColor" />
          </span>
          <span className="stat-tag positive">
            <ArrowUpRight size={13} /> KEEP IT UP
          </span>
        </div>
        <div className="stat-value">
          {dashboard.streaks.current}
          <small>days</small>
        </div>
        <div className="stat-label">Current streak</div>
        <div className="stat-foot">
          <span className="mini-flame">
            <Flame size={14} fill="currentColor" />
          </span>{' '}
          Your longest is {dashboard.streaks.longest} days
        </div>
      </article>
      <article className="stat-card">
        <div className="stat-top">
          <span className="stat-icon target-icon">
            <Target size={18} />
          </span>
          <span className={`stat-tag ${todayGoalMet ? 'positive' : 'neutral'}`}>
            {todayGoalMet ? (
              <>
                <Check size={13} /> GOAL MET
              </>
            ) : (
              <>
                <ArrowDownRight size={13} /> TODAY
              </>
            )}
          </span>
        </div>
        <div className="stat-value">
          {todayCount}
          <small>/{dashboard.goal.dailyTarget}</small>
        </div>
        <div className="stat-label">Today’s activity</div>
        <div className="stat-foot">
          {todayGoalMet
            ? 'Lovely work. You showed up today.'
            : `${Math.max(0, dashboard.goal.dailyTarget - todayCount)} more to hit your daily goal`}
        </div>
      </article>
      <article className="stat-card">
        <div className="stat-top">
          <span className="stat-icon week-icon">
            <CalendarDays size={18} />
          </span>
          <span className="stat-tag neutral">LAST 7 DAYS</span>
        </div>
        <div className="stat-value">
          {dashboard.weekProgress.completed}
          <small>/7</small>
        </div>
        <div className="stat-label">Days on track</div>
        <div
          className="week-dots"
          aria-label={`${dashboard.weekProgress.completed} of 7 goal days complete`}
        >
          {Array.from({ length: 7 }, (_, index) => (
            <i className={index < dashboard.weekProgress.completed ? 'done' : ''} key={index} />
          ))}
        </div>
      </article>
      <article className="stat-card">
        <div className="stat-top">
          <span className="stat-icon trophy-icon">
            <Trophy size={18} />
          </span>
          <span className="stat-tag neutral">MILESTONES</span>
        </div>
        <div className="stat-value">
          {dashboard.badges.length}
          <small> earned</small>
        </div>
        <div className="stat-label">Badges unlocked</div>
        <div className="stat-foot">
          {dashboard.badges.length
            ? 'Every day adds up.'
            : 'Your first one is just around the corner.'}
        </div>
      </article>
    </section>
  );
}
