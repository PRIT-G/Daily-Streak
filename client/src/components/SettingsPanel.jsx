import { useState } from 'react';
import {
  AlertTriangle,
  Bell,
  Check,
  Download,
  Link2,
  LoaderCircle,
  ShieldCheck,
  Snowflake,
  Trash2,
  Trophy,
  Unlink,
  X,
} from 'lucide-react';
import { providerLabel } from '../features/providers/catalog.js';
import { createWebhookToken, revokeWebhookToken } from '../features/webhooks/api.js';
import ProviderMark from './dashboard/ProviderMark.jsx';

export default function SettingsPanel({
  user,
  dashboard,
  token,
  onSaveGoal,
  onSaveReminders,
  onSaveStreakFreeze,
  onSavePublicProfile,
  onConnect,
  onRefresh,
  onClose,
  busyProvider,
  notice,
  onExportAccount,
  onExportActivityCsv,
  onDeleteAccount,
}) {
  const [goal, setGoal] = useState(dashboard.goal.dailyTarget);
  const [reminders, setReminders] = useState(dashboard.reminders.enabled);
  const [time, setTime] = useState(dashboard.reminders.reminderTime || '20:00');
  const [weeklyDigest, setWeeklyDigest] = useState(dashboard.reminders.weeklyDigest === true);
  const [streakFreeze, setStreakFreeze] = useState(dashboard.streakFreeze?.enabled === true);
  const [publicProfile, setPublicProfile] = useState(dashboard.publicProfile?.enabled === true);
  const [webhookSecret, setWebhookSecret] = useState('');
  const [webhookBusy, setWebhookBusy] = useState(false);
  const providerEntries = Object.entries(dashboard.providers || {});
  const [usernames, setUsernames] = useState(() =>
    Object.fromEntries(
      providerEntries.map(([provider, connection]) => [provider, connection.username || ''])
    )
  );
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteAcknowledged, setDeleteAcknowledged] = useState(false);
  const [accountBusy, setAccountBusy] = useState('');
  const [accountMessage, setAccountMessage] = useState('');

  async function exportData() {
    setAccountBusy('export');
    setAccountMessage('');
    const success = await onExportAccount();
    setAccountMessage(success ? 'Your account export has been downloaded.' : '');
    setAccountBusy('');
  }

  async function generateWebhook() {
    setWebhookBusy(true);
    try {
      const result = await createWebhookToken(token);
      setWebhookSecret(result.secret);
    } catch {
      setAccountMessage('Could not generate a webhook secret. Try again.');
    } finally {
      setWebhookBusy(false);
    }
  }

  async function revokeWebhook() {
    setWebhookBusy(true);
    try {
      await revokeWebhookToken(token);
      setWebhookSecret('');
      setAccountMessage('Webhook secret revoked.');
    } catch {
      setAccountMessage('Could not revoke the webhook secret. Try again.');
    } finally {
      setWebhookBusy(false);
    }
  }

  async function deleteData(event) {
    event.preventDefault();
    if (!deleteAcknowledged) return;
    setAccountBusy('delete');
    setAccountMessage('');
    const success = await onDeleteAccount(deletePassword);
    if (!success) {
      setAccountMessage(
        'Account deletion could not be completed. Check your password and try again.'
      );
      setAccountBusy('');
      return;
    }
  }

  return (
    <div
      className="modal-backdrop"
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
    >
      <section
        className="settings-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-title"
      >
        <header className="modal-header">
          <div>
            <span className="auth-kicker">MAKE IT YOURS</span>
            <h2 id="settings-title">Your setup</h2>
          </div>
          <button className="icon-button" aria-label="Close settings" onClick={onClose}>
            <X size={19} />
          </button>
        </header>
        {notice && (
          <div
            className={notice.type === 'error' ? 'inline-error' : 'inline-success'}
            role="status"
          >
            {notice.text}
          </div>
        )}
        <section className="settings-section">
          <div className="section-title">
            <span className="section-icon">
              <Link2 size={17} />
            </span>
            <div>
              <h3>Connections</h3>
              <p>Public activity only. No provider passwords.</p>
            </div>
          </div>
          {providerEntries.map(([provider, connection]) => {
            const label = providerLabel(provider);
            const connected = Boolean(connection.username);
            return (
              <div className="connection-row" key={provider}>
                <ProviderMark provider={provider} />
                <div className="connection-main">
                  <strong>{label}</strong>
                  <small>
                    {connected ? connection.username : 'Not connected'}
                    {connection.lastSyncedAt
                      ? ` · Synced ${new Date(connection.lastSyncedAt).toLocaleDateString()}`
                      : ''}
                  </small>
                  {connected && connection.message && (
                    <small className={connection.status === 'error' ? 'text-error' : ''}>
                      {connection.message}
                    </small>
                  )}
                </div>
                {connected ? (
                  <div className="connection-actions">
                    <button
                      className="small-button"
                      disabled={busyProvider === provider}
                      onClick={() => onRefresh(provider)}
                    >
                      {busyProvider === provider ? (
                        <LoaderCircle className="spin" size={14} />
                      ) : (
                        'Refresh'
                      )}
                    </button>
                    <button
                      className="icon-button subtle"
                      aria-label={`Disconnect ${label}`}
                      title="Disconnect provider"
                      onClick={() => {
                        setUsernames({ ...usernames, [provider]: '' });
                        onConnect(provider, '');
                      }}
                    >
                      <Unlink size={15} />
                    </button>
                  </div>
                ) : (
                  <form
                    className="connect-form"
                    onSubmit={(e) => {
                      e.preventDefault();
                      onConnect(provider, usernames[provider]);
                    }}
                  >
                    <input
                      aria-label={`${label} username`}
                      placeholder="username"
                      value={usernames[provider] || ''}
                      onChange={(e) => setUsernames({ ...usernames, [provider]: e.target.value })}
                    />
                    <button className="small-button" disabled={!usernames[provider]?.trim()}>
                      Connect
                    </button>
                  </form>
                )}
              </div>
            );
          })}
          <p className="provider-disclaimer">
            Only public profile activity is imported. Codeforces sync is limited to the current year
            and its latest 10,000 submissions. LeetCode uses an unofficial public endpoint.
          </p>
        </section>
        <section className="settings-section">
          <div className="section-title">
            <span className="section-icon peach">
              <Check size={17} />
            </span>
            <div>
              <h3>Daily goal</h3>
              <p>Count of public activity items to hit your goal.</p>
            </div>
          </div>
          <form
            className="goal-form"
            onSubmit={(e) => {
              e.preventDefault();
              onSaveGoal(Number(goal));
            }}
          >
            <label htmlFor="goal-input">Daily activity target</label>
            <div>
              <input
                id="goal-input"
                type="number"
                min="1"
                max="1000"
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
              />
              <span>items / day</span>
              <button className="small-button">Save goal</button>
            </div>
          </form>
        </section>
        <section className="settings-section">
          <div className="section-title">
            <span className="section-icon">
              <Snowflake size={17} />
            </span>
            <div>
              <h3>Streak freeze</h3>
              <p>Banked shields cover missed days so one off day doesn’t end your streak.</p>
            </div>
          </div>
          <div className="reminder-row">
            <label className="toggle">
              <input
                type="checkbox"
                checked={streakFreeze}
                onChange={(e) => setStreakFreeze(e.target.checked)}
              />
              <span />
            </label>
            <strong>{streakFreeze ? 'Freeze on' : 'Freeze off'}</strong>
            <span className="freeze-shields">
              {dashboard.streakFreeze?.shields || 0} shield
              {(dashboard.streakFreeze?.shields || 0) === 1 ? '' : 's'} banked
            </span>
            <button className="small-button" onClick={() => onSaveStreakFreeze(streakFreeze)}>
              Save
            </button>
          </div>
          <p className="reminder-note">
            Earn 1 shield for every 7 days of longest streak (max 5). Shields automatically cover
            recent missed days within 14 days of today.
          </p>
        </section>
        <section className="settings-section">
          <div className="section-title">
            <span className="section-icon">
              <Trophy size={17} />
            </span>
            <div>
              <h3>Public streak card</h3>
              <p>
                Share a read-only card with your streak stats. Also appears on the weekly
                leaderboard.
              </p>
            </div>
          </div>
          <div className="reminder-row">
            <label className="toggle">
              <input
                type="checkbox"
                checked={publicProfile}
                onChange={(e) => setPublicProfile(e.target.checked)}
              />
              <span />
            </label>
            <strong>{publicProfile ? 'Public card on' : 'Public card off'}</strong>
            <button className="small-button" onClick={() => onSavePublicProfile(publicProfile)}>
              Save
            </button>
          </div>
          {publicProfile && dashboard.publicProfile?.id && (
            <p className="reminder-note">
              Share link:{' '}
              <code>{`${window.location.origin}/#/u/${dashboard.publicProfile.id}`}</code>{' '}
              <button
                type="button"
                className="small-button"
                onClick={() =>
                  navigator.clipboard?.writeText(
                    `${window.location.origin}/#/u/${dashboard.publicProfile.id}`
                  )
                }
              >
                Copy
              </button>
            </p>
          )}
        </section>
        <section className="settings-section">
          <div className="section-title">
            <span className="section-icon peach">
              <Link2 size={17} />
            </span>
            <div>
              <h3>Webhook ingestion</h3>
              <p>POST activity from any tool (scripts, CI, other apps) to your streak.</p>
            </div>
          </div>
          {!webhookSecret ? (
            <button
              type="button"
              className="small-button"
              disabled={webhookBusy}
              onClick={generateWebhook}
            >
              {webhookBusy ? 'Generating…' : 'Generate webhook secret'}
            </button>
          ) : (
            <div className="webhook-secret-box">
              <p className="reminder-note">Secret (shown once — store it safely):</p>
              <code className="webhook-secret">{webhookSecret}</code>
              <p className="reminder-note">
                POST to <code>/api/webhooks/activity</code> with{' '}
                <code>
                  {
                    '{ "secret": "…", "count": 1, "date": "YYYY-MM-DD", "type": "coding", "title": "…" }'
                  }
                </code>
              </p>
              <div className="account-data-actions">
                <button
                  type="button"
                  className="small-button"
                  onClick={() => navigator.clipboard?.writeText(webhookSecret)}
                >
                  Copy secret
                </button>
                <button
                  type="button"
                  className="account-delete-link"
                  disabled={webhookBusy}
                  onClick={revokeWebhook}
                >
                  Revoke secret
                </button>
              </div>
            </div>
          )}
        </section>
        <section className="settings-section last">
          <div className="section-title">
            <span className="section-icon lilac">
              <Bell size={17} />
            </span>
            <div>
              <h3>A gentle reminder</h3>
              <p>Email when you’re short of your goal for the day.</p>
            </div>
          </div>
          <div className="reminder-row">
            <label className="toggle">
              <input
                type="checkbox"
                checked={reminders}
                onChange={(e) => setReminders(e.target.checked)}
              />
              <span />
            </label>
            <strong>{reminders ? 'Reminders on' : 'Reminders off'}</strong>
            <input
              aria-label="Reminder time in UTC"
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
            />
            <button
              className="small-button"
              onClick={() => onSaveReminders(reminders, time, weeklyDigest)}
            >
              Save
            </button>
          </div>
          <div className="reminder-row">
            <label className="toggle">
              <input
                type="checkbox"
                checked={weeklyDigest}
                onChange={(e) => setWeeklyDigest(e.target.checked)}
              />
              <span />
            </label>
            <strong>{weeklyDigest ? 'Weekly digest on' : 'Weekly digest off'}</strong>
            <span className="freeze-shields">Sundays, 17:00 UTC</span>
            <button
              className="small-button"
              onClick={() => onSaveReminders(reminders, time, weeklyDigest)}
            >
              Save
            </button>
          </div>
          <p className="reminder-note">
            {reminders
              ? 'Time is UTC. Email delivery requires SMTP to be configured by your app administrator.'
              : 'Turn on to opt in. You can change this anytime.'}{' '}
            The weekly digest emails your streak, consistency score, and recommendations every
            Sunday.
          </p>
        </section>
        <section className="settings-section account-data-section">
          <div className="section-title">
            <span className="section-icon lilac">
              <ShieldCheck size={17} />
            </span>
            <div>
              <h3>Your account data</h3>
              <p>Export a copy or permanently remove your account and its saved data.</p>
            </div>
          </div>
          <p className="account-data-email">{user?.email}</p>
          <div className="account-data-actions">
            <button
              type="button"
              className="small-button account-export-button"
              disabled={Boolean(accountBusy)}
              onClick={exportData}
            >
              {accountBusy === 'export' ? (
                <LoaderCircle className="spin" size={14} />
              ) : (
                <Download size={14} />
              )}
              {accountBusy === 'export' ? 'Preparing export…' : 'Download my data (JSON)'}
            </button>
            <button
              type="button"
              className="small-button account-export-button"
              disabled={Boolean(accountBusy)}
              onClick={async () => {
                setAccountBusy('csv');
                setAccountMessage('');
                const ok = await onExportActivityCsv();
                setAccountMessage(ok ? 'Your activity CSV has been downloaded.' : '');
                setAccountBusy('');
              }}
            >
              {accountBusy === 'csv' ? (
                <LoaderCircle className="spin" size={14} />
              ) : (
                <Download size={14} />
              )}
              {accountBusy === 'csv' ? 'Preparing CSV…' : 'Download activity (CSV)'}
            </button>
          </div>
          {!deleteOpen ? (
            <button
              type="button"
              className="account-delete-link"
              disabled={Boolean(accountBusy)}
              onClick={() => {
                setDeleteOpen(true);
                setAccountMessage('');
              }}
            >
              <Trash2 size={14} /> Delete account
            </button>
          ) : (
            <form className="account-delete-form" onSubmit={deleteData}>
              <strong>
                <AlertTriangle size={15} /> This permanently deletes your account.
              </strong>
              <p>
                Your profile, activity, study tasks, uploaded badges, and saved integration
                credentials will be removed. This cannot be undone.
              </p>
              <label>
                Current password
                <input
                  type="password"
                  autoComplete="current-password"
                  required
                  maxLength="128"
                  value={deletePassword}
                  onChange={(event) => setDeletePassword(event.target.value)}
                />
              </label>
              <label className="account-delete-ack">
                <input
                  type="checkbox"
                  checked={deleteAcknowledged}
                  onChange={(event) => setDeleteAcknowledged(event.target.checked)}
                />{' '}
                I understand this action is permanent.
              </label>
              <div>
                <button
                  type="submit"
                  className="button account-delete-confirm"
                  disabled={Boolean(accountBusy) || !deleteAcknowledged}
                >
                  {accountBusy === 'delete' ? 'Deleting…' : 'Permanently delete account'}
                </button>
                <button
                  type="button"
                  className="button button-outline"
                  disabled={Boolean(accountBusy)}
                  onClick={() => setDeleteOpen(false)}
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
          {accountMessage && (
            <p className="account-data-message" role="status">
              {accountMessage}
            </p>
          )}
        </section>
      </section>
    </div>
  );
}
