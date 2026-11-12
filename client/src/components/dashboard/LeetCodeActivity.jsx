import { useEffect, useState } from 'react';
import { ArrowUpRight, RefreshCw } from 'lucide-react';
import { getLeetCodeSubmissions } from '../../features/integrations/api.js';
import ActivityMessage from './ActivityMessage.jsx';

export default function LeetCodeActivity({ token, username, onOpenSettings }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  async function loadSubmissions() {
    setLoading(true);
    setError('');
    try {
      setData(await getLeetCodeSubmissions(token));
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (username) loadSubmissions();
    else setLoading(false);
  }, [token, username]);

  return (
    <article className="panel provider-activity-panel">
      <header className="provider-activity-heading">
        <div>
          <div className="panel-kicker">LEETCODE PRACTICE</div>
          <h2>{data?.username ? `@${data.username}` : 'All LeetCode activity'}</h2>
          <p>Recent problems with submission status, difficulty, and topic tags.</p>
        </div>
        {username && (
          <button
            type="button"
            className="small-button"
            onClick={loadSubmissions}
            disabled={loading}
          >
            <RefreshCw size={14} /> Refresh
          </button>
        )}
      </header>
      {!username && (
        <div className="provider-activity-empty">
          <strong>Connect a LeetCode username to view submissions</strong>
          <p>Set your public profile username under Settings → Connections.</p>
          <button type="button" className="text-button" onClick={onOpenSettings}>
            Open connections <ArrowUpRight size={14} />
          </button>
        </div>
      )}
      {username && error && (
        <ActivityMessage error={error} loading={loading} onRetry={loadSubmissions} />
      )}
      {username && loading && !error && <ActivityMessage loading />}
      {username && data && !loading && (
        <>
          <p className="provider-activity-limitation">{data.limitations}</p>
          {data.submissions.length ? (
            <div className="leetcode-submission-list">
              {data.submissions.map((submission) => (
                <article className="leetcode-submission-row" key={submission.id}>
                  <div className="leetcode-submission-main">
                    <a
                      href={`https://leetcode.com/problems/${encodeURIComponent(submission.titleSlug)}/`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {submission.questionNumber ? `${submission.questionNumber}. ` : ''}
                      {submission.title}
                      <ArrowUpRight size={13} />
                    </a>
                    <small>
                      {submission.submittedAt
                        ? new Date(submission.submittedAt).toLocaleString()
                        : 'Date unavailable'}{' '}
                      · {submission.language || 'Language unavailable'}
                    </small>
                    <div className="leetcode-topic-list">
                      {submission.topics.length ? (
                        submission.topics.map((topic) => <span key={topic}>{topic}</span>)
                      ) : (
                        <small>Topics unavailable</small>
                      )}
                    </div>
                  </div>
                  <div className="leetcode-submission-status">
                    <strong
                      className={submission.status.toLowerCase() === 'accepted' ? 'accepted' : ''}
                    >
                      {submission.status}
                    </strong>
                    <span className={`difficulty-${submission.difficulty.toLowerCase()}`}>
                      {submission.difficulty || 'Unknown'}
                    </span>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <ActivityMessage empty emptyTitle="No recent submissions were returned." />
          )}
        </>
      )}
    </article>
  );
}
