import { useEffect, useState } from 'react';
import { Flame, Trophy } from 'lucide-react';
import { getLeaderboard } from '../features/public/api.js';

export default function LeaderboardPage({ onBack }) {
  const [entries, setEntries] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    getLeaderboard()
      .then((result) => active && setEntries(result.leaderboard))
      .catch((err) => active && setError(err.message));
    return () => { active = false; };
  }, []);

  return (
    <main className="public-page">
      <header className="public-header">
        <a className="brand" href="#/"><span className="brand-mark"><Flame size={19} fill="currentColor" /></span> daily<span>streak</span></a>
        <button className="small-button" type="button" onClick={onBack}>Back</button>
      </header>
      <section className="public-card">
        <span className="panel-kicker">WEEKLY CONSISTENCY</span>
        <h1><Trophy size={22} /> Leaderboard</h1>
        <p className="public-sub">Opted-in members ranked by goal days this week, then current streak.</p>
        {error && <p className="inline-error" role="alert">{error}</p>}
        {!entries && !error && <p className="public-status">Loading…</p>}
        {entries?.length === 0 && <p className="public-status">No opted-in members have activity this week yet.</p>}
        {entries?.length > 0 && (
          <ol className="leaderboard-list">
            {entries.map((entry, index) => (
              <li key={`${entry.name}-${index}`} className={index < 3 ? 'leaderboard-top' : ''}>
                <span className="leaderboard-rank">{index + 1}</span>
                <span className="leaderboard-name">{entry.name}</span>
                <span className="leaderboard-meta">{entry.goalDaysThisWeek} goal days · {entry.currentStreak}d streak</span>
              </li>
            ))}
          </ol>
        )}
        <p className="public-note">Only members who enable a public profile appear here. Enable yours in Settings.</p>
      </section>
    </main>
  );
}
