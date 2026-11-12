import { useEffect, useState } from 'react';
import { LoaderCircle, Plus, Trash2 } from 'lucide-react';
import {
  createPrivateActivityEntry,
  deletePrivateActivityEntry,
  getPrivateActivityEntries,
} from '../../features/activity/api.js';
import ActivityMessage from './ActivityMessage.jsx';

export default function PrivateActivity({ token, onNotice, onRefreshDashboard }) {
  const [entries, setEntries] = useState([]);
  const [title, setTitle] = useState('');
  const [details, setDetails] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [type, setType] = useState('coding');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState('');

  async function loadEntries() {
    setLoading(true);
    setError('');
    try {
      const result = await getPrivateActivityEntries(token);
      setEntries(result.entries);
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadEntries();
  }, [token]);

  async function addEntry(event) {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      await createPrivateActivityEntry(token, { title, details, date, type });
      setTitle('');
      setDetails('');
      await loadEntries();
      await onRefreshDashboard();
      onNotice({ type: 'success', text: 'Private activity saved to your account.' });
    } catch (saveError) {
      setError(saveError.message);
    } finally {
      setSaving(false);
    }
  }

  async function removeEntry(entryId) {
    setDeletingId(entryId);
    setError('');
    try {
      await deletePrivateActivityEntry(token, entryId);
      setEntries((current) => current.filter((entry) => entry.id !== entryId));
      await onRefreshDashboard();
      onNotice({ type: 'success', text: 'Private activity removed.' });
    } catch (deleteError) {
      setError(deleteError.message);
    } finally {
      setDeletingId('');
    }
  }

  return (
    <article className="panel provider-activity-panel">
      <header className="provider-activity-heading">
        <div>
          <div className="panel-kicker">ONLY VISIBLE TO YOU</div>
          <h2>Private activity</h2>
          <p>Keep private work and study activity in your account without publishing it.</p>
        </div>
      </header>
      <p className="provider-activity-limitation">
        Entries are private to your signed-in account, count toward your activity calendar and
        streak, and are included in your account export. They are not shown in public badge
        galleries.
      </p>
      {error && (
        <div className="provider-activity-error" role="alert">
          {error}
        </div>
      )}
      <form className="private-activity-form" onSubmit={addEntry}>
        <label>
          Activity
          <input
            required
            maxLength="120"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="e.g. Fixed a private project bug"
          />
        </label>
        <label>
          Date
          <input
            required
            type="date"
            max={new Date().toISOString().slice(0, 10)}
            value={date}
            onChange={(event) => setDate(event.target.value)}
          />
        </label>
        <label>
          Type
          <select value={type} onChange={(event) => setType(event.target.value)}>
            <option value="coding">Coding</option>
            <option value="study">Study</option>
            <option value="other">Other</option>
          </select>
        </label>
        <label className="private-activity-details">
          Details (optional)
          <input
            maxLength="500"
            value={details}
            onChange={(event) => setDetails(event.target.value)}
            placeholder="Private note about this activity"
          />
        </label>
        <button type="submit" className="button button-dark" disabled={saving || !title.trim()}>
          {saving ? <LoaderCircle className="spin" size={14} /> : <Plus size={14} />} Add private
          activity
        </button>
      </form>
      <section className="private-activity-entries" aria-label="Your private activity entries">
        <div className="private-activity-list-heading">
          <strong>Your entries</strong>
          <span>{entries.length} shown · up to 500</span>
        </div>
        {loading ? (
          <ActivityMessage loading />
        ) : entries.length ? (
          entries.map((entry) => (
            <article className="private-activity-entry" key={entry.id}>
              <div>
                <strong>{entry.title}</strong>
                <small>
                  {entry.date} · {entry.type}
                </small>
                {entry.details && <p>{entry.details}</p>}
              </div>
              <button
                type="button"
                className="icon-button"
                aria-label={`Delete ${entry.title}`}
                disabled={deletingId === entry.id}
                onClick={() => removeEntry(entry.id)}
              >
                {deletingId === entry.id ? (
                  <LoaderCircle className="spin" size={15} />
                ) : (
                  <Trash2 size={15} />
                )}
              </button>
            </article>
          ))
        ) : (
          <ActivityMessage empty emptyTitle="No private activity yet. Add one above." />
        )}
      </section>
    </article>
  );
}
