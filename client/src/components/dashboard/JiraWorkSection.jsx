import { ExternalLink, LoaderCircle, RefreshCw, Search } from 'lucide-react';

export default function JiraWorkSection({
  jiraIssues,
  jiraNextPageToken,
  jiraSites,
  selectedJiraSite,
  jiraSiteChanging,
  jiraLoading,
  jiraTransitions,
  jiraSelection,
  setJiraSelection,
  jiraAssignmentIssue,
  setJiraAssignmentIssue,
  jiraAssigneeQuery,
  setJiraAssigneeQuery,
  jiraAssigneeResults,
  setJiraAssigneeResults,
  jiraAssigneeSelection,
  setJiraAssigneeSelection,
  busyAction,
  loadJira,
  loadMoreJira,
  onSelectJiraSite,
  showTransitions,
  changeJiraStatus,
  findAssignees,
  saveAssignee,
  runAction,
}) {
  return (
    <>
      {jiraSites.length > 1 && (
        <label className="jira-site-picker">
          <span>Jira site</span>
          <select
            aria-label="Select Jira site"
            value={selectedJiraSite}
            onChange={onSelectJiraSite}
            disabled={jiraSiteChanging}
          >
            {jiraSites.map((site) => (
              <option value={site.cloudId} key={site.cloudId}>
                {site.siteName}
              </option>
            ))}
          </select>
        </label>
      )}
      <div className="work-toolbar">
        <p>Assigned issues, ordered by recent activity. Loaded in pages of 50.</p>
        <button className="small-button" onClick={() => runAction(loadJira)} disabled={jiraLoading}>
          {jiraLoading ? <LoaderCircle className="spin" size={13} /> : <RefreshCw size={13} />}{' '}
          Refresh
        </button>
      </div>
      {jiraLoading && !jiraIssues.length ? (
        <div className="work-empty">Loading Jira issues…</div>
      ) : jiraIssues.length ? (
        <div className="jira-issue-list">
          {jiraIssues.map((issue) => (
            <article className="jira-issue" key={issue.key}>
              <div className="jira-issue-main">
                <a href={issue.url} target="_blank" rel="noopener noreferrer">
                  <strong>{issue.key}</strong>
                  <ExternalLink size={12} />
                </a>
                <p>{issue.summary}</p>
                <small>
                  {issue.project}
                  {issue.priority ? ` · ${issue.priority}` : ''}
                  {issue.dueDate ? ` · Due ${issue.dueDate}` : ''}
                  {issue.assignee ? ` · Assigned to ${issue.assignee}` : ' · Unassigned'}
                </small>
              </div>
              <div className="jira-issue-actions">
                <span className="jira-status">{issue.status}</span>
                {jiraTransitions[issue.key]?.length > 0 ? (
                  <div className="jira-transition-form">
                    <select
                      aria-label={`New status for ${issue.key}`}
                      value={jiraSelection[issue.key] || ''}
                      onChange={(event) =>
                        setJiraSelection((current) => ({
                          ...current,
                          [issue.key]: event.target.value,
                        }))
                      }
                    >
                      {jiraTransitions[issue.key].map((transition) => (
                        <option key={transition.id} value={transition.id}>
                          {transition.status || transition.name}
                        </option>
                      ))}
                    </select>
                    <button
                      className="small-button"
                      disabled={!jiraSelection[issue.key] || busyAction === issue.key}
                      onClick={() => changeJiraStatus(issue.key)}
                    >
                      Update
                    </button>
                  </div>
                ) : (
                  <button className="small-button" onClick={() => showTransitions(issue.key)}>
                    Change status
                  </button>
                )}
                {jiraAssignmentIssue === issue.key ? (
                  <div className="jira-assignment-form">
                    <form
                      onSubmit={(event) => {
                        event.preventDefault();
                        findAssignees(issue.key);
                      }}
                    >
                      <input
                        aria-label={`Search Jira assignees for ${issue.key}`}
                        placeholder="Find a teammate"
                        value={jiraAssigneeQuery}
                        onChange={(event) => setJiraAssigneeQuery(event.target.value)}
                      />
                      <button
                        className="small-button"
                        disabled={jiraAssigneeQuery.trim().length < 2}
                      >
                        <Search size={12} /> Find
                      </button>
                    </form>
                    {jiraAssigneeResults !== null && (
                      <>
                        {!jiraAssigneeResults.length && (
                          <small>No matching assignees. You can still unassign this issue.</small>
                        )}
                        <select
                          aria-label={`Select assignee for ${issue.key}`}
                          value={jiraAssigneeSelection}
                          onChange={(event) => setJiraAssigneeSelection(event.target.value)}
                        >
                          <option value="">Unassigned</option>
                          {jiraAssigneeResults.map((person) => (
                            <option value={person.accountId} key={person.accountId}>
                              {person.displayName}
                            </option>
                          ))}
                        </select>
                        <button
                          className="small-button"
                          disabled={busyAction === issue.key}
                          onClick={() => saveAssignee(issue.key)}
                        >
                          Save
                        </button>
                      </>
                    )}
                  </div>
                ) : (
                  <button
                    className="small-button"
                    onClick={() => {
                      setJiraAssignmentIssue(issue.key);
                      setJiraAssigneeQuery('');
                      setJiraAssigneeResults(null);
                      setJiraAssigneeSelection('');
                    }}
                  >
                    Assign
                  </button>
                )}
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="work-empty">No Jira issues are currently assigned to you.</div>
      )}
      {jiraNextPageToken && (
        <div className="work-pagination">
          <button className="small-button" onClick={loadMoreJira} disabled={jiraLoading}>
            {jiraLoading ? <LoaderCircle className="spin" size={13} /> : null}
            Load more Jira issues
          </button>
        </div>
      )}
    </>
  );
}
