import { useCallback, useEffect, useState } from 'react';
import { Briefcase, Search } from 'lucide-react';
import {
  createNotionTask,
  disconnectIntegration,
  getIntegrationStatuses,
  getJiraIssues,
  getJiraTransitions,
  getNotionTasks,
  searchNotion,
  searchJiraAssignees,
  selectJiraSite,
  startIntegrationConnect,
  updateJiraAssignee,
  updateJiraIssueStatus,
  updateNotionTask
} from '../../features/integrations/api.js';
import WorkSection from './WorkSection.jsx';
import JiraWorkSection from './JiraWorkSection.jsx';
import NotionWorkSection from './NotionWorkSection.jsx';

export default function WorkHub({ token, onNotice }) {
  const [integrations, setIntegrations] = useState({
    jira: { connected: false, configured: false },
    notion: { connected: false, configured: false }
  });
  const [jiraIssues, setJiraIssues] = useState([]);
  const [jiraNextPageToken, setJiraNextPageToken] = useState('');
  const [jiraLoading, setJiraLoading] = useState(false);
  const [jiraSiteChanging, setJiraSiteChanging] = useState(false);
  const [jiraTransitions, setJiraTransitions] = useState({});
  const [jiraSelection, setJiraSelection] = useState({});
  const [jiraAssignmentIssue, setJiraAssignmentIssue] = useState('');
  const [jiraAssigneeQuery, setJiraAssigneeQuery] = useState('');
  const [jiraAssigneeResults, setJiraAssigneeResults] = useState(null);
  const [jiraAssigneeSelection, setJiraAssigneeSelection] = useState('');
  const [busyAction, setBusyAction] = useState('');
  const [notionPages, setNotionPages] = useState([]);
  const [notionDatabases, setNotionDatabases] = useState([]);
  const [notionSearchCursors, setNotionSearchCursors] = useState({ pages: '', databases: '' });
  const [notionSearchHasMore, setNotionSearchHasMore] = useState({ pages: false, databases: false });
  const [notionSearchLoading, setNotionSearchLoading] = useState(false);
  const [notionQuery, setNotionQuery] = useState('');
  const [notionActiveQuery, setNotionActiveQuery] = useState('');
  const [selectedDatabase, setSelectedDatabase] = useState('');
  const [notionData, setNotionData] = useState(null);
  const [notionLoading, setNotionLoading] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDueDate, setNewTaskDueDate] = useState('');
  const [editingTask, setEditingTask] = useState('');
  const [editingTitle, setEditingTitle] = useState('');

  const loadJira = useCallback(async (nextPageToken = '', append = false) => {
    setJiraLoading(true);
    try {
      const data = await getJiraIssues(token, nextPageToken);
      setJiraIssues((current) => append ? [...current, ...data.issues] : data.issues);
      setJiraNextPageToken(data.nextPageToken || '');
    } catch (loadError) {
      onNotice({ type: 'error', text: loadError.message });
    } finally {
      setJiraLoading(false);
    }
  }, [onNotice, token]);

  const loadNotionTasks = useCallback(async (databaseId, cursor = '', append = false) => {
    setSelectedDatabase(databaseId);
    setNotionLoading(true);
    try {
      const data = await getNotionTasks(token, databaseId, cursor);
      setNotionData((current) => append && current?.database.id === databaseId
        ? {
          ...data,
          tasks: [...current.tasks, ...data.tasks]
        }
        : data);
    } catch (loadError) {
      onNotice({ type: 'error', text: loadError.message });
    } finally {
      setNotionLoading(false);
    }
  }, [onNotice, token]);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const { integrations: currentIntegrations } = await getIntegrationStatuses(token);
        if (!active) return;
        setIntegrations(currentIntegrations);
        if (currentIntegrations.jira?.connected) loadJira();
        if (currentIntegrations.notion?.connected) {
          const [pages, databases] = await Promise.all([
            searchNotion(token, '', 'page'),
            searchNotion(token, '', 'database')
          ]);
          if (!active) return;
          setNotionPages(pages.results);
          setNotionDatabases(databases.results);
          setNotionSearchCursors({ pages: pages.nextCursor || '', databases: databases.nextCursor || '' });
          setNotionSearchHasMore({ pages: Boolean(pages.hasMore), databases: Boolean(databases.hasMore) });
        }
      } catch (loadError) {
        if (active) onNotice({ type: 'error', text: loadError.message });
      }
    }
    load();
    return () => { active = false; };
  }, [loadJira, onNotice, token]);

  useEffect(() => {
    const callback = new URLSearchParams(window.location.hash.split('?')[1] || '').get('work');
    if (!callback) return;
    const provider = callback.split('-')[0];
    const status = callback.split('-')[1];
    onNotice({
      type: status === 'connected' ? 'success' : 'error',
      text: status === 'connected'
        ? `${provider === 'jira' ? 'Jira' : 'Notion'} connected successfully.`
        : `${provider === 'jira' ? 'Jira' : 'Notion'} connection was not completed.`
    });
    window.history.replaceState(null, '', '#work');
  }, [onNotice]);

  async function connect(provider) {
    setBusyAction(`${provider}-connect`);
    try {
      const { url } = await startIntegrationConnect(token, provider);
      window.location.assign(url);
    } catch (connectError) {
      onNotice({ type: 'error', text: connectError.message });
      setBusyAction('');
    }
  }

  async function disconnect(provider) {
    setBusyAction(`${provider}-disconnect`);
    try {
      await disconnectIntegration(token, provider);
      setIntegrations((current) => ({
        ...current,
        [provider]: { ...current[provider], connected: false }
      }));
      if (provider === 'jira') setJiraIssues([]);
      if (provider === 'notion') {
        setNotionPages([]);
        setNotionDatabases([]);
        setNotionSearchCursors({ pages: '', databases: '' });
        setNotionSearchHasMore({ pages: false, databases: false });
        setNotionData(null);
        setSelectedDatabase('');
      }
      onNotice({ type: 'success', text: `${provider === 'jira' ? 'Jira' : 'Notion'} disconnected.` });
    } catch (disconnectError) {
      onNotice({ type: 'error', text: disconnectError.message });
    } finally {
      setBusyAction('');
    }
  }

  async function runAction(action, successMessage) {
    try {
      const result = await action();
      if (successMessage) onNotice({ type: 'success', text: successMessage });
      return result;
    } catch (error) {
      onNotice({ type: 'error', text: error.message });
      return null;
    }
  }

  async function loadNotionSearch(event) {
    event?.preventDefault();
    if (notionSearchLoading) return;
    setNotionSearchLoading(true);
    const query = notionQuery;
    try {
      const result = await runAction(async () => {
        const [pages, databases] = await Promise.all([
          searchNotion(token, query, 'page'),
          searchNotion(token, query, 'database')
        ]);
        return { pages, databases };
      });
      if (result) {
        setNotionActiveQuery(query);
        setNotionPages(result.pages.results);
        setNotionDatabases(result.databases.results);
        setNotionSearchCursors({
          pages: result.pages.nextCursor || '',
          databases: result.databases.nextCursor || ''
        });
        setNotionSearchHasMore({
          pages: Boolean(result.pages.hasMore),
          databases: Boolean(result.databases.hasMore)
        });
      }
    } finally {
      setNotionSearchLoading(false);
    }
  }

  async function loadMoreNotionSearch(type) {
    const cursor = notionSearchCursors[type];
    if (!cursor || notionSearchLoading) return;
    setNotionSearchLoading(true);
    try {
      const result = await runAction(() => searchNotion(token, notionActiveQuery, type, cursor));
      if (!result) return;
      if (type === 'pages') setNotionPages((current) => [...current, ...result.results]);
      else setNotionDatabases((current) => [...current, ...result.results]);
      setNotionSearchCursors((current) => ({ ...current, [type]: result.nextCursor || '' }));
      setNotionSearchHasMore((current) => ({ ...current, [type]: Boolean(result.hasMore) }));
    } finally {
      setNotionSearchLoading(false);
    }
  }

  async function changeJiraSite(event) {
    const cloudId = event.target.value;
    if (!cloudId || cloudId === integrations.jira.cloudId || jiraSiteChanging) return;
    setJiraSiteChanging(true);
    try {
      const result = await runAction(() => selectJiraSite(token, cloudId), 'Jira site changed.');
      if (!result) return;
      setIntegrations((current) => ({
        ...current,
        jira: { ...current.jira, ...result.site }
      }));
      setJiraIssues([]);
      setJiraNextPageToken('');
      await loadJira();
    } finally {
      setJiraSiteChanging(false);
    }
  }

  async function loadMoreJira() {
    if (jiraNextPageToken) await loadJira(jiraNextPageToken, true);
  }

  async function loadMoreNotionTasks() {
    if (notionData?.nextCursor && selectedDatabase) {
      await loadNotionTasks(selectedDatabase, notionData.nextCursor, true);
    }
  }

  async function showTransitions(issueKey) {
    const result = await runAction(() => getJiraTransitions(token, issueKey));
    if (result) {
      setJiraTransitions((current) => ({ ...current, [issueKey]: result.transitions }));
      setJiraSelection((current) => ({ ...current, [issueKey]: result.transitions[0]?.id || '' }));
    }
  }

  async function changeJiraStatus(issueKey) {
    const transitionId = jiraSelection[issueKey];
    if (!transitionId) return;
    setBusyAction(issueKey);
    const result = await runAction(async () => {
      await updateJiraIssueStatus(token, issueKey, transitionId);
      await loadJira();
      return true;
    }, 'Jira issue status updated.');
    if (result) setJiraTransitions((current) => ({ ...current, [issueKey]: null }));
    setBusyAction('');
  }

  async function findJiraAssignees(issueKey) {
    const result = await runAction(() => searchJiraAssignees(token, issueKey, jiraAssigneeQuery));
    if (result) {
      setJiraAssignmentIssue(issueKey);
      setJiraAssigneeResults(result.users);
      setJiraAssigneeSelection('');
    }
  }

  async function saveJiraAssignee(issueKey) {
    setBusyAction(issueKey);
    const result = await runAction(async () => {
      await updateJiraAssignee(token, issueKey, jiraAssigneeSelection);
      await loadJira();
      return true;
    }, 'Jira issue assignment updated.');
    if (result) setJiraAssignmentIssue('');
    setBusyAction('');
  }

  async function addNotionTask(event) {
    event.preventDefault();
    if (!newTaskTitle.trim() || !selectedDatabase) return;
    setBusyAction('notion-create');
    const result = await runAction(async () => {
      await createNotionTask(token, selectedDatabase, { title: newTaskTitle, dueDate: newTaskDueDate });
      await loadNotionTasks(selectedDatabase);
      return true;
    }, 'Notion task created.');
    if (result) {
      setNewTaskTitle('');
      setNewTaskDueDate('');
    }
    setBusyAction('');
  }

  async function saveNotionTask(pageId, changes, message) {
    setBusyAction(pageId);
    const result = await runAction(async () => {
      await updateNotionTask(token, pageId, changes);
      await loadNotionTasks(selectedDatabase);
      return true;
    }, message);
    if (result) setEditingTask('');
    setBusyAction('');
  }

  return (
    <section className="page-section work-hub">
      <div className="welcome-row">
        <div>
          <div className="eyebrow muted-eyebrow">
            <span className="eyebrow-dot" /> YOUR CONNECTED WORKSPACES
          </div>
          <h1>Work hub<span className="wave">✳</span></h1>
          <p>Bring your Jira work and Notion pages into one focused space.</p>
        </div>
      </div>

      <WorkSection
        icon={Briefcase}
        title="Jira"
        description="Assigned work, status, priority, project, and due dates."
        connected={integrations.jira.connected}
        configured={integrations.jira.configured}
        identity={integrations.jira.siteName ? `Connected to ${integrations.jira.siteName}` : ''}
        onConnect={() => connect('jira')}
        onDisconnect={() => disconnect('jira')}
        loading={busyAction.startsWith('jira-')}
      >
        <JiraWorkSection
          jiraIssues={jiraIssues}
          jiraNextPageToken={jiraNextPageToken}
          jiraSites={integrations.jira.sites || []}
          selectedJiraSite={integrations.jira.cloudId || ''}
          jiraSiteChanging={jiraSiteChanging}
          jiraLoading={jiraLoading}
          jiraTransitions={jiraTransitions}
          jiraSelection={jiraSelection}
          setJiraSelection={setJiraSelection}
          jiraAssignmentIssue={jiraAssignmentIssue}
          setJiraAssignmentIssue={setJiraAssignmentIssue}
          jiraAssigneeQuery={jiraAssigneeQuery}
          setJiraAssigneeQuery={setJiraAssigneeQuery}
          jiraAssigneeResults={jiraAssigneeResults}
          setJiraAssigneeResults={setJiraAssigneeResults}
          jiraAssigneeSelection={jiraAssigneeSelection}
          setJiraAssigneeSelection={setJiraAssigneeSelection}
          busyAction={busyAction}
          loadJira={loadJira}
          loadMoreJira={loadMoreJira}
          onSelectJiraSite={changeJiraSite}
          showTransitions={showTransitions}
          changeJiraStatus={changeJiraStatus}
          findAssignees={findJiraAssignees}
          saveAssignee={saveJiraAssignee}
          runAction={runAction}
        />
      </WorkSection>

      <WorkSection
        icon={Search}
        title="Notion"
        description="Browse shared pages, choose a task database, and create or update tasks."
        connected={integrations.notion.connected}
        configured={integrations.notion.configured}
        identity={integrations.notion.workspaceName ? `Connected to ${integrations.notion.workspaceName}` : ''}
        onConnect={() => connect('notion')}
        onDisconnect={() => disconnect('notion')}
        loading={busyAction.startsWith('notion-')}
      >
        <NotionWorkSection
          notionPages={notionPages}
          notionDatabases={notionDatabases}
          notionSearchCursors={notionSearchCursors}
          notionSearchHasMore={notionSearchHasMore}
          notionSearchLoading={notionSearchLoading}
          notionQuery={notionQuery}
          setNotionQuery={setNotionQuery}
          selectedDatabase={selectedDatabase}
          notionData={notionData}
          notionLoading={notionLoading}
          newTaskTitle={newTaskTitle}
          setNewTaskTitle={setNewTaskTitle}
          newTaskDueDate={newTaskDueDate}
          setNewTaskDueDate={setNewTaskDueDate}
          editingTask={editingTask}
          setEditingTask={setEditingTask}
          editingTitle={editingTitle}
          setEditingTitle={setEditingTitle}
          busyAction={busyAction}
          loadNotionSearch={loadNotionSearch}
          loadMoreNotionSearch={loadMoreNotionSearch}
          loadNotionTasks={loadNotionTasks}
          loadMoreNotionTasks={loadMoreNotionTasks}
          addNotionTask={addNotionTask}
          saveNotionTask={saveNotionTask}
          runAction={runAction}
        />
      </WorkSection>
    </section>
  );
}
