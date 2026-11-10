import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import JiraWorkSection from '../components/dashboard/JiraWorkSection.jsx';
import NotionWorkSection from '../components/dashboard/NotionWorkSection.jsx';

describe('Work hub pagination', () => {
  it('lets users select an authorized Jira site and load the next issue page', () => {
    const loadMoreJira = vi.fn();
    const onSelectJiraSite = vi.fn();
    render(
      <JiraWorkSection
        jiraIssues={[]}
        jiraNextPageToken="next-page"
        jiraSites={[
          { cloudId: 'site-one', siteName: 'Personal' },
          { cloudId: 'site-two', siteName: 'Work' },
        ]}
        selectedJiraSite="site-one"
        jiraSiteChanging={false}
        jiraLoading={false}
        jiraTransitions={{}}
        jiraSelection={{}}
        setJiraSelection={vi.fn()}
        jiraAssignmentIssue=""
        setJiraAssignmentIssue={vi.fn()}
        jiraAssigneeQuery=""
        setJiraAssigneeQuery={vi.fn()}
        jiraAssigneeResults={null}
        setJiraAssigneeResults={vi.fn()}
        jiraAssigneeSelection=""
        setJiraAssigneeSelection={vi.fn()}
        busyAction=""
        loadJira={vi.fn()}
        loadMoreJira={loadMoreJira}
        onSelectJiraSite={onSelectJiraSite}
        showTransitions={vi.fn()}
        changeJiraStatus={vi.fn()}
        findAssignees={vi.fn()}
        saveAssignee={vi.fn()}
        runAction={vi.fn()}
      />
    );

    fireEvent.change(screen.getByRole('combobox', { name: 'Select Jira site' }), {
      target: { value: 'site-two' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Load more Jira issues' }));

    expect(onSelectJiraSite).toHaveBeenCalledOnce();
    expect(loadMoreJira).toHaveBeenCalledOnce();
  });

  it('loads the next Notion page and database search results independently', () => {
    const loadMoreNotionSearch = vi.fn();
    render(
      <NotionWorkSection
        notionPages={[]}
        notionDatabases={[]}
        notionSearchCursors={{ pages: 'page-cursor', databases: 'database-cursor' }}
        notionSearchHasMore={{ pages: true, databases: true }}
        notionSearchLoading={false}
        notionQuery=""
        setNotionQuery={vi.fn()}
        selectedDatabase=""
        notionData={null}
        notionLoading={false}
        newTaskTitle=""
        setNewTaskTitle={vi.fn()}
        newTaskDueDate=""
        setNewTaskDueDate={vi.fn()}
        editingTask=""
        setEditingTask={vi.fn()}
        editingTitle=""
        setEditingTitle={vi.fn()}
        busyAction=""
        loadNotionSearch={vi.fn()}
        loadMoreNotionSearch={loadMoreNotionSearch}
        loadNotionTasks={vi.fn()}
        loadMoreNotionTasks={vi.fn()}
        addNotionTask={vi.fn()}
        saveNotionTask={vi.fn()}
        runAction={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Load more pages' }));
    fireEvent.click(screen.getByRole('button', { name: 'Load more databases' }));

    expect(loadMoreNotionSearch).toHaveBeenNthCalledWith(1, 'pages');
    expect(loadMoreNotionSearch).toHaveBeenNthCalledWith(2, 'databases');
  });
});
