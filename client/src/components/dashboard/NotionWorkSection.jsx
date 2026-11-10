import { Check, ChevronDown, ExternalLink, LoaderCircle, Plus, RefreshCw, Search } from 'lucide-react';

export default function NotionWorkSection({
  notionPages,
  notionDatabases,
  notionSearchCursors,
  notionSearchHasMore,
  notionSearchLoading,
  notionQuery,
  setNotionQuery,
  selectedDatabase,
  notionData,
  notionLoading,
  newTaskTitle,
  setNewTaskTitle,
  newTaskDueDate,
  setNewTaskDueDate,
  editingTask,
  setEditingTask,
  editingTitle,
  setEditingTitle,
  busyAction,
  loadNotionSearch,
  loadMoreNotionSearch,
  loadNotionTasks,
  loadMoreNotionTasks,
  addNotionTask,
  saveNotionTask,
  runAction
}) {
  return (
    <>
      <form className="notion-search-form" onSubmit={loadNotionSearch}>
        <input
          aria-label="Search Notion pages and databases"
          placeholder="Search pages and databases"
          value={notionQuery}
          onChange={(event) => setNotionQuery(event.target.value)}
        />
        <button className="small-button" disabled={notionSearchLoading}>
          {notionSearchLoading ? <LoaderCircle className="spin" size={13} /> : <Search size={13} />} Search
        </button>
      </form>
      <div className="notion-browser">
        <div className="notion-results">
          <h3>Task databases</h3>
          {notionDatabases.length ? (
            notionDatabases.map((database) => (
              <button
                type="button"
                className={`notion-result ${selectedDatabase === database.id ? 'active' : ''}`}
                key={database.id}
                onClick={() => runAction(() => loadNotionTasks(database.id))}
              >
                <span>{database.title}</span>
                <ChevronDown size={14} />
              </button>
            ))
          ) : (
            <p className="work-empty compact">
              No shared databases found. Share a database with your Notion integration first.
            </p>
          )}
          {notionSearchHasMore.databases && (
            <div className="work-pagination">
              <button
                type="button"
                className="small-button"
                onClick={() => loadMoreNotionSearch('databases')}
                disabled={!notionSearchCursors.databases || notionSearchLoading}
              >
                Load more databases
              </button>
            </div>
          )}
          <h3>Pages</h3>
          <p className="work-results-note">Search results load in batches of 50.</p>
          {notionPages.length ? (
            notionPages.map((page) => (
              <a
                className="notion-result"
                href={page.url}
                target="_blank"
                rel="noopener noreferrer"
                key={page.id}
              >
                <span>{page.title}</span>
                <ExternalLink size={13} />
              </a>
            ))
          ) : (
            <p className="work-empty compact">No shared pages found.</p>
          )}
          {notionSearchHasMore.pages && (
            <div className="work-pagination">
              <button
                type="button"
                className="small-button"
                onClick={() => loadMoreNotionSearch('pages')}
                disabled={!notionSearchCursors.pages || notionSearchLoading}
              >
                Load more pages
              </button>
            </div>
          )}
        </div>
        <div className="notion-task-area">
          {!selectedDatabase ? (
            <div className="work-empty">Select a shared database to use its rows as tasks.</div>
          ) : (
            <>
              <div className="work-toolbar">
                <div>
                  <h3>{notionData?.database.title || 'Notion tasks'}</h3>
                  <p>Tasks load in batches of 100, most recently edited first. Changes are saved to Notion.</p>
                </div>
                <button
                  className="small-button"
                  onClick={() => runAction(() => loadNotionTasks(selectedDatabase))}
                  disabled={notionLoading}
                >
                  {notionLoading ? <LoaderCircle className="spin" size={13} /> : <RefreshCw size={13} />} Refresh
                </button>
              </div>
              {notionData?.schema.status?.options.length > 0 && (
                <p className="notion-schema-note">Status property: {notionData.schema.status.name}</p>
              )}
              <form className="notion-create-form" onSubmit={addNotionTask}>
                <input
                  required
                  maxLength="120"
                  placeholder="Add a task to this database"
                  value={newTaskTitle}
                  onChange={(event) => setNewTaskTitle(event.target.value)}
                />
                {notionData?.schema.dueDate && (
                  <input
                    aria-label="New task due date"
                    type="date"
                    value={newTaskDueDate}
                    onChange={(event) => setNewTaskDueDate(event.target.value)}
                  />
                )}
                <button
                  className="small-button"
                  disabled={!newTaskTitle.trim() || busyAction === 'notion-create'}
                >
                  <Plus size={13} /> Add
                </button>
              </form>
              {notionLoading && !notionData ? (
                <div className="work-empty">Loading Notion tasks…</div>
              ) : notionData?.tasks.length ? (
                <ul className="notion-task-list">
                  {notionData.tasks.map((task) => (
                    <li key={task.id}>
                      {editingTask === task.id ? (
                        <form
                          className="notion-task-edit"
                          onSubmit={(event) => {
                            event.preventDefault();
                            saveNotionTask(task.id, { title: editingTitle }, 'Notion task updated.');
                          }}
                        >
                          <input
                            aria-label={`Task title for ${task.title}`}
                            maxLength="120"
                            value={editingTitle}
                            onChange={(event) => setEditingTitle(event.target.value)}
                          />
                          <button className="icon-button" aria-label="Save task title">
                            <Check size={15} />
                          </button>
                        </form>
                      ) : (
                        <div className="notion-task-title">
                          <strong>{task.title}</strong>
                          <button
                            className="icon-button"
                            aria-label={`Edit ${task.title}`}
                            onClick={() => {
                              setEditingTask(task.id);
                              setEditingTitle(task.title);
                            }}
                          >
                            Edit
                          </button>
                        </div>
                      )}
                      <div className="notion-task-controls">
                        {notionData.schema.status?.options.length > 0 && (
                          <label>
                            <span>Status</span>
                            <select
                              value={task.status}
                              onChange={(event) =>
                                saveNotionTask(
                                  task.id,
                                  { status: event.target.value },
                                  'Notion task status updated.'
                                )
                              }
                            >
                              <option value="" disabled>
                                Choose status
                              </option>
                              {notionData.schema.status.options.map((status) => (
                                <option value={status} key={status}>
                                  {status}
                                </option>
                              ))}
                            </select>
                          </label>
                        )}
                        {notionData.schema.dueDate && (
                          <label>
                            <span>Due date</span>
                            <input
                              type="date"
                              value={task.dueDate}
                              onChange={(event) =>
                                saveNotionTask(
                                  task.id,
                                  { dueDate: event.target.value },
                                  'Notion task due date updated.'
                                )
                              }
                            />
                          </label>
                        )}
                        {task.url && (
                          <a
                            href={task.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label={`Open ${task.title} in Notion`}
                          >
                            <ExternalLink size={14} />
                          </a>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="work-empty">This database has no tasks yet. Add one above.</div>
              )}
              {notionData?.hasMore && (
                <div className="work-pagination">
                  <button
                    className="small-button"
                    onClick={loadMoreNotionTasks}
                    disabled={notionLoading || !notionData.nextCursor}
                  >
                    {notionLoading ? <LoaderCircle className="spin" size={13} /> : null}
                    Load more tasks
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}
