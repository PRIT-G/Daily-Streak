import { useEffect, useState } from 'react';
import { ArrowLeft, ArrowRight, ArrowUpRight, LoaderCircle, RefreshCw, Unlink } from 'lucide-react';
import {
  disconnectIntegration,
  getGithubActivity,
  getGithubPrivateActivity,
  getGithubPrivateRepositories,
  getIntegrationStatuses,
  startIntegrationConnect,
} from '../../features/integrations/api.js';
import ActivityMessage from './ActivityMessage.jsx';

export default function GitHubActivity({ token }) {
  const [integration, setIntegration] = useState({
    connected: false,
    configured: false,
    callbackUrl: '',
    privateAccess: false,
  });
  const [data, setData] = useState(null);
  const [privateRepositories, setPrivateRepositories] = useState([]);
  const [selectedRepositories, setSelectedRepositories] = useState([]);
  const [privateActivity, setPrivateActivity] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [privateLoading, setPrivateLoading] = useState(false);
  const [repositoryPage, setRepositoryPage] = useState(1);
  const [repositoriesHaveMore, setRepositoriesHaveMore] = useState(false);
  const [includePrivateOnConnect, setIncludePrivateOnConnect] = useState(false);

  async function loadPrivateRepositories(page = 1) {
    setError('');
    try {
      const result = await getGithubPrivateRepositories(token, page);
      setPrivateRepositories(result.repositories);
      setRepositoryPage(result.page);
      setRepositoriesHaveMore(result.hasMore);
    } catch (loadError) {
      setError(loadError.message);
    }
  }

  async function loadActivity() {
    setLoading(true);
    setError('');
    try {
      setData(await getGithubActivity(token));
      if (integration.privateAccess) await loadPrivateRepositories(repositoryPage);
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const { integrations } = await getIntegrationStatuses(token);
        if (!active) return;
        const github = integrations.github || {
          connected: false,
          configured: false,
          privateAccess: false,
        };
        setIntegration(github);
        if (github.connected) {
          setLoading(true);
          try {
            const result = await getGithubActivity(token);
            if (active) setData(result);
            if (active && github.privateAccess) {
              const repositories = await getGithubPrivateRepositories(token);
              if (active) {
                setPrivateRepositories(repositories.repositories);
                setRepositoriesHaveMore(repositories.hasMore);
              }
            }
          } catch (loadError) {
            if (active) setError(loadError.message);
          } finally {
            if (active) setLoading(false);
          }
        } else {
          setLoading(false);
        }
      } catch (loadError) {
        if (active) {
          setError(loadError.message);
          setLoading(false);
        }
      }
    }
    load();
    return () => {
      active = false;
    };
  }, [token]);

  async function connect(includePrivateRepositories = false) {
    setBusy(true);
    setError('');
    try {
      const { url } = await startIntegrationConnect(token, 'github', {
        includePrivateRepositories,
      });
      window.location.assign(url);
    } catch (connectError) {
      setError(connectError.message);
      setBusy(false);
    }
  }

  async function disconnect() {
    setBusy(true);
    setError('');
    try {
      await disconnectIntegration(token, 'github');
      setIntegration((current) => ({ ...current, connected: false }));
      setData(null);
      setPrivateActivity(null);
      setPrivateRepositories([]);
    } catch (disconnectError) {
      setError(disconnectError.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <article className="panel provider-activity-panel">
      <header className="provider-activity-heading">
        <div>
          <div className="panel-kicker">GITHUB WORK</div>
          <h2>{data?.profile?.login ? `@${data.profile.login}` : 'All GitHub activity'}</h2>
          <p>Repository activity, commits, pull requests, reviews, issues, and merges.</p>
        </div>
        {integration.connected ? (
          <div className="provider-activity-actions">
            <button
              type="button"
              className="small-button"
              onClick={loadActivity}
              disabled={loading || busy}
            >
              {loading ? <LoaderCircle className="spin" size={14} /> : <RefreshCw size={14} />}{' '}
              Refresh
            </button>
            <button type="button" className="small-button" onClick={disconnect} disabled={busy}>
              <Unlink size={14} /> Disconnect
            </button>
          </div>
        ) : integration.configured ? (
          <button
            type="button"
            className="button button-dark"
            onClick={() => connect(includePrivateOnConnect)}
            disabled={busy}
          >
            {busy ? <LoaderCircle className="spin" size={14} /> : <ArrowUpRight size={14} />}{' '}
            Connect GitHub
          </button>
        ) : (
          <span className="setup-config-tag optional">Not enabled yet</span>
        )}
      </header>
      {error && (
        <div className="provider-activity-error" role="alert">
          {error}
        </div>
      )}
      {!integration.connected && (
        <div className="provider-activity-empty">
          <strong>
            {integration.configured
              ? 'Connect your GitHub account'
              : 'GitHub connection is not enabled yet'}
          </strong>
          <p>
            {integration.configured
              ? 'Public activity is the default. Private repositories are never queried unless you opt in here; you can also add personal activity entries in the Private activity tab.'
              : 'The app owner enables GitHub once for everyone. After it is enabled, you can connect your own GitHub account here without setting up OAuth credentials.'}
          </p>
          {integration.configured && (
            <label className="private-repository-consent">
              <input
                type="checkbox"
                checked={includePrivateOnConnect}
                onChange={(event) => setIncludePrivateOnConnect(event.target.checked)}
              />
              <span>
                <strong>Allow access to my private repositories</strong>
                <small>
                  Optional. GitHub’s <code>repo</code> scope is broad and may grant write-capable
                  permissions. We only make read requests. Private data is loaded only for
                  repositories you select.
                </small>
              </span>
            </label>
          )}
        </div>
      )}
      {integration.connected && !integration.privateAccess && (
        <div className="provider-activity-empty private-repository-consent-panel">
          <strong>Private repositories are off</strong>
          <p>
            Your current GitHub connection does not request private repository access. This is
            optional and requires a new GitHub authorization.
          </p>
          <label className="private-repository-consent">
            <input
              type="checkbox"
              checked={includePrivateOnConnect}
              onChange={(event) => setIncludePrivateOnConnect(event.target.checked)}
            />
            <span>
              <strong>Allow access to my private repositories</strong>
              <small>
                GitHub’s <code>repo</code> scope is broad and may grant write-capable permissions.
                The app only makes read requests and only loads repositories you select.
              </small>
            </span>
          </label>
          <button
            type="button"
            className="button button-outline"
            onClick={() => connect(true)}
            disabled={!includePrivateOnConnect || busy}
          >
            {busy ? <LoaderCircle className="spin" size={14} /> : <ArrowUpRight size={14} />} Enable
            private repository access
          </button>
        </div>
      )}
      {integration.connected && data && (
        <>
          <div className="provider-activity-metrics">
            {[
              ['Events', data.summary.events],
              ['Commits', data.summary.commits],
              ['Pull requests', data.summary.pullRequests],
              ['Reviews', data.summary.reviews],
              ['Issues', data.summary.issues],
              ['Merged', data.summary.merged],
              ['Conflicts detected', data.summary.conflicts],
              ['Repositories', data.summary.repositories],
            ].map(([label, value]) => (
              <div key={label}>
                <strong>{value}</strong>
                <span>{label}</span>
              </div>
            ))}
          </div>
          <p className="provider-activity-limitation">{data.limitations}</p>
          <div className="provider-activity-repositories">
            <strong>Repositories in this activity window</strong>
            <p>
              {data.repositories.length
                ? data.repositories.join(' · ')
                : 'No repositories returned.'}
            </p>
          </div>
          <div className="provider-event-list">
            {data.events.map((event) => (
              <article className="provider-event-row" key={event.id}>
                <span className="provider-event-marker" />
                <div className="provider-event-copy">
                  <strong>{event.summary || event.type}</strong>
                  <small>
                    {event.repository || 'GitHub'} ·{' '}
                    {event.createdAt
                      ? new Date(event.createdAt).toLocaleString()
                      : 'Date unavailable'}
                  </small>
                  {event.pullRequest && (
                    <small>
                      PR #{event.pullRequest.number} ·{' '}
                      {event.pullRequest.merged
                        ? 'Merged'
                        : event.pullRequest.state || 'Status unavailable'}
                      {event.pullRequest.mergeable === false ||
                      event.pullRequest.mergeableState === 'dirty'
                        ? ' · Merge conflicts detected'
                        : event.pullRequest.mergeable === true
                          ? ' · Mergeable'
                          : ' · Mergeability unknown'}
                    </small>
                  )}
                  {event.reviewState && <small>Review: {event.reviewState}</small>}
                </div>
                {event.url && (
                  <a
                    className="provider-event-link"
                    href={event.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Open on GitHub"
                  >
                    <ArrowUpRight size={15} />
                  </a>
                )}
              </article>
            ))}
          </div>
          {!loading && !error && !data.events.length && (
            <ActivityMessage empty emptyTitle="No recent GitHub events were returned." />
          )}
          {integration.privateAccess && (
            <section className="private-repository-section">
              <header>
                <div>
                  <strong>Selected private repositories</strong>
                  <p>
                    Choose up to 5 repositories. Only your commits and pull requests in those
                    repositories are loaded.
                  </p>
                </div>
                <div className="private-repository-pagination">
                  <button
                    type="button"
                    className="icon-button"
                    disabled={repositoryPage <= 1}
                    aria-label="Previous private repositories"
                    onClick={() => loadPrivateRepositories(repositoryPage - 1)}
                  >
                    <ArrowLeft size={15} />
                  </button>
                  <span>Page {repositoryPage}</span>
                  <button
                    type="button"
                    className="icon-button"
                    disabled={!repositoriesHaveMore}
                    aria-label="Next private repositories"
                    onClick={() => loadPrivateRepositories(repositoryPage + 1)}
                  >
                    <ArrowRight size={15} />
                  </button>
                </div>
              </header>
              {privateRepositories.length ? (
                <>
                  <div className="private-repository-list">
                    {privateRepositories.map((repository) => (
                      <label key={repository.fullName}>
                        <input
                          type="checkbox"
                          checked={selectedRepositories.includes(repository.fullName)}
                          onChange={(event) =>
                            setSelectedRepositories((current) =>
                              event.target.checked
                                ? [...current, repository.fullName].slice(-5)
                                : current.filter((name) => name !== repository.fullName)
                            )
                          }
                        />
                        <span>
                          <strong>{repository.fullName}</strong>
                          <small>
                            {repository.description ||
                              `Updated ${repository.pushedAt ? new Date(repository.pushedAt).toLocaleDateString() : 'date unavailable'}`}
                          </small>
                        </span>
                      </label>
                    ))}
                  </div>
                  <button
                    type="button"
                    className="button button-dark"
                    disabled={!selectedRepositories.length || privateLoading}
                    onClick={async () => {
                      setPrivateLoading(true);
                      setError('');
                      try {
                        setPrivateActivity(
                          await getGithubPrivateActivity(token, selectedRepositories)
                        );
                      } catch (loadError) {
                        setError(loadError.message);
                      } finally {
                        setPrivateLoading(false);
                      }
                    }}
                  >
                    {privateLoading ? (
                      <LoaderCircle className="spin" size={14} />
                    ) : (
                      <RefreshCw size={14} />
                    )}
                    Load selected private activity
                  </button>
                </>
              ) : (
                <ActivityMessage empty emptyTitle="No private repositories on this page." />
              )}
              {privateActivity && (
                <>
                  <p className="provider-activity-limitation">{privateActivity.limitations}</p>
                  <div className="provider-activity-metrics">
                    {[
                      ['Private repos', privateActivity.summary.repositories],
                      ['Commits', privateActivity.summary.commits],
                      ['Pull requests', privateActivity.summary.pullRequests],
                      ['Merged', privateActivity.summary.merged],
                    ].map(([label, value]) => (
                      <div key={label}>
                        <strong>{value}</strong>
                        <span>{label}</span>
                      </div>
                    ))}
                  </div>
                  <div className="provider-event-list">
                    {privateActivity.events.map((event) => (
                      <article
                        className="provider-event-row"
                        key={`${event.repository}-${event.id}`}
                      >
                        <span className="provider-event-marker" />
                        <div className="provider-event-copy">
                          <strong>{event.summary}</strong>
                          <small>
                            {event.repository} · {event.type} ·{' '}
                            {event.createdAt
                              ? new Date(event.createdAt).toLocaleString()
                              : 'Date unavailable'}
                          </small>
                          {event.number && (
                            <small>
                              PR #{event.number} · {event.state}
                            </small>
                          )}
                        </div>
                        {event.url && (
                          <a
                            className="provider-event-link"
                            href={event.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label="Open on GitHub"
                          >
                            <ArrowUpRight size={15} />
                          </a>
                        )}
                      </article>
                    ))}
                  </div>
                </>
              )}
            </section>
          )}
        </>
      )}
      {integration.connected && loading && <ActivityMessage loading />}
    </article>
  );
}
