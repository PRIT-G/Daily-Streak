import { ArrowRight, BookOpenCheck, Check, Flame, Link2, Target, Trophy } from 'lucide-react';
import { providerLabel } from '../../features/providers/catalog.js';

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

function getNextTask(tasks = []) {
  return tasks
    .filter((task) => !task.completed)
    .sort((a, b) => {
      if (!a.dueDate) return b.dueDate ? 1 : 0;
      if (!b.dueDate) return -1;
      return a.dueDate.localeCompare(b.dueDate);
    })[0];
}

export default function OverviewHero({
  name,
  dashboard,
  todayCount,
  todayGoalMet,
  onOpenSettings,
}) {
  const target = dashboard.goal.dailyTarget;
  const progress = target > 0 ? Math.min(100, Math.round((todayCount / target) * 100)) : 0;
  const providers = Object.entries(dashboard.providers || {}).filter(
    ([, provider]) => provider.username
  );
  const nextTask = getNextTask(dashboard.tasks);
  const pendingTasks = (dashboard.tasks || []).filter((task) => !task.completed).length;

  return (
    <>
      <section className="overview-hero" aria-labelledby="overview-title">
        <div className="overview-hero-copy">
          <div className="overview-hero-kicker">
            <span /> YOUR PERSONAL PROGRESS SPACE
          </div>
          <h1 id="overview-title">
            {getGreeting()}, {name}
            <span className="overview-spark">✳</span>
          </h1>
          <p>
            One place for your studies, coding practice, and the progress you’re building every day.
          </p>
          <div className="overview-hero-actions">
            <a className="overview-primary-action" href="#planner">
              Plan your day <ArrowRight size={16} />
            </a>
            <button className="overview-secondary-action" onClick={onOpenSettings}>
              <Link2 size={15} /> Manage connections
            </button>
          </div>
        </div>
        <div className="overview-focus-card">
          <div className="overview-focus-top">
            <span className="overview-focus-icon">
              <Target size={17} />
            </span>
            <span className="overview-focus-label">TODAY’S FOCUS</span>
            {todayGoalMet && (
              <span className="overview-focus-done">
                <Check size={12} /> DONE
              </span>
            )}
          </div>
          <div className="overview-focus-progress">
            <div className="overview-focus-ring" style={{ '--focus-progress': `${progress}%` }}>
              <span>
                {progress}
                <small>%</small>
              </span>
            </div>
            <div>
              <strong>
                {todayGoalMet
                  ? 'Goal complete'
                  : todayCount
                    ? 'Keep your rhythm'
                    : 'Start with one small win'}
              </strong>
              <span>
                {todayGoalMet
                  ? 'You showed up today.'
                  : `${Math.max(0, target - todayCount)} more ${target - todayCount === 1 ? 'activity' : 'activities'} to reach your goal.`}
              </span>
            </div>
          </div>
          <div className="overview-focus-footer">
            <Flame size={14} fill="currentColor" /> {dashboard.streaks.current} day streak{' '}
            <span>·</span> {dashboard.weekProgress.completed}/7 days this week
          </div>
        </div>
      </section>

      <section className="overview-shortcuts" aria-label="Workspace shortcuts">
        <a className="overview-shortcut" href="#planner">
          <span className="overview-shortcut-icon planner-shortcut-icon">
            <BookOpenCheck size={18} />
          </span>
          <span className="overview-shortcut-copy">
            <small>STUDY PLANNER</small>
            <strong>{nextTask ? nextTask.title : 'Make room for a study win'}</strong>
            <span>
              {nextTask
                ? `${pendingTasks} ${pendingTasks === 1 ? 'task' : 'tasks'} still in your plan`
                : 'Add an assignment, exam, or study session'}
            </span>
          </span>
          <ArrowRight className="overview-shortcut-arrow" size={16} />
        </a>
        <button className="overview-shortcut" onClick={onOpenSettings}>
          <span className="overview-shortcut-icon connections-shortcut-icon">
            <Link2 size={18} />
          </span>
          <span className="overview-shortcut-copy">
            <small>CONNECTED PLATFORMS</small>
            <strong>
              {providers.length
                ? `${providers.length} ${providers.length === 1 ? 'platform' : 'platforms'} connected`
                : 'Bring your activity together'}
            </strong>
            <span>
              {providers.length
                ? providers.map(([provider]) => providerLabel(provider)).join(' · ')
                : 'Connect GitHub, LeetCode, and more'}
            </span>
          </span>
          <ArrowRight className="overview-shortcut-arrow" size={16} />
        </button>
        <a className="overview-shortcut" href="#milestones">
          <span className="overview-shortcut-icon milestones-shortcut-icon">
            <Trophy size={18} />
          </span>
          <span className="overview-shortcut-copy">
            <small>MILESTONES</small>
            <strong>
              {dashboard.badges.length
                ? `${dashboard.badges.length} badge${dashboard.badges.length === 1 ? '' : 's'} earned`
                : 'Your next milestone awaits'}
            </strong>
            <span>Small steps make a story worth celebrating</span>
          </span>
          <ArrowRight className="overview-shortcut-arrow" size={16} />
        </a>
      </section>
    </>
  );
}
