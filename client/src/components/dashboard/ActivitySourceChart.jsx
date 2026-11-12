import { providerIcon, providerLabel } from '../../features/providers/catalog.js';
import Heatmap from '../Heatmap.jsx';
import ProviderMark from './ProviderMark.jsx';

function formatActivityDate(date) {
  if (!date) return '';
  return new Date(`${date}T12:00:00`).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatSyncDate(date) {
  if (!date) return '';
  return new Date(date).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export default function ActivitySourceChart({ activity, provider, connection = {}, year, target }) {
  const sourceTotal = activity.reduce((total, day) => {
    const count = Number(day.sources?.[provider] ?? day[provider] ?? 0);
    return total + Math.max(0, count || 0);
  }, 0);
  const activeDays = activity.reduce((total, day) => {
    const count = Number(day.sources?.[provider] ?? day[provider] ?? 0);
    return total + (count > 0 ? 1 : 0);
  }, 0);
  const latestActivity = activity
    .filter((day) => Number(day.sources?.[provider] ?? day[provider] ?? 0) > 0)
    .reduce((latest, day) => (day.date > latest ? day.date : latest), '');
  const label = providerLabel(provider);

  return (
    <section
      className={`source-chart source-chart-${provider}`}
      aria-labelledby={`source-chart-${provider}`}
    >
      <header className="source-chart-heading">
        <ProviderMark provider={providerIcon(provider)} />
        <div className="source-chart-title">
          <h3 id={`source-chart-${provider}`}>{label}</h3>
          <p>{connection.username || 'Not connected'}</p>
          <span className="source-chart-freshness">
            {latestActivity
              ? `Latest activity ${formatActivityDate(latestActivity)}`
              : `No activity recorded in ${year}`}
            {connection.lastSyncedAt && ` · Synced ${formatSyncDate(connection.lastSyncedAt)}`}
          </span>
        </div>
        <div
          className="source-chart-summary"
          aria-label={`${sourceTotal} contributions over ${activeDays} active days`}
        >
          <strong>{sourceTotal.toLocaleString()}</strong>
          <span>
            {activeDays} active {activeDays === 1 ? 'day' : 'days'}
          </span>
        </div>
      </header>
      <Heatmap
        activity={activity}
        year={year}
        target={target}
        source={provider}
        sourceLabel={label}
      />
    </section>
  );
}
