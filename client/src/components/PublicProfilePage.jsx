import { useEffect, useState } from 'react';
import { Flame } from 'lucide-react';
import { getPublicProfile } from '../features/public/api.js';

export default function PublicProfilePage({ userId, onBack }) {
  const [profile, setProfile] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    getPublicProfile(userId)
      .then((result) => active && setProfile(result.profile))
      .catch((err) => active && setError(err.message))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [userId]);

  return (
    <main className="public-page">
      <header className="public-header">
        <a className="brand" href="#/">
          <span className="brand-mark">
            <Flame size={19} fill="currentColor" />
          </span>{' '}
          daily<span>streak</span>
        </a>
        <button className="small-button" type="button" onClick={onBack}>
          Back
        </button>
      </header>
      {loading && <p className="public-status">Loading profile…</p>}
      {error && (
        <p className="inline-error" role="alert">
          {error}
        </p>
      )}
      {profile && (
        <section className="public-card">
          <span className="panel-kicker">PUBLIC STREAK CARD</span>
          <h1>{profile.name}</h1>
          <p className="public-sub">
            Member since{' '}
            {new Date(profile.memberSince).toLocaleDateString(undefined, {
              month: 'long',
              year: 'numeric',
            })}
          </p>
          <div className="public-stats">
            <div className="public-stat">
              <strong>{profile.currentStreak}</strong>
              <span>current streak</span>
            </div>
            <div className="public-stat">
              <strong>{profile.longestStreak}</strong>
              <span>longest streak</span>
            </div>
            <div className="public-stat">
              <strong>{profile.consistencyScore}%</strong>
              <span>30-day consistency</span>
            </div>
            <div className="public-stat">
              <strong>{profile.goalDaysLast30}</strong>
              <span>goal days / 30</span>
            </div>
            <div className="public-stat">
              <strong>{profile.badgesEarned}</strong>
              <span>badges</span>
            </div>
          </div>
          {profile.streakFreezeEnabled && (
            <p className="public-note">Streak freeze enabled — shields protect missed days.</p>
          )}
          <a className="small-button" href="#/">
            Start your own streak
          </a>
        </section>
      )}
    </main>
  );
}
