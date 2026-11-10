import { useMemo, useState } from 'react';
import {
  BookOpen, CalendarDays, Check, Circle, ClipboardList, Clock3, Pencil, Plus, Trash2, X
} from 'lucide-react';

const TASK_TYPES = [
  { value: 'assignment', label: 'Assignment' },
  { value: 'exam', label: 'Exam' },
  { value: 'study', label: 'Study session' }
];

const EMPTY_FORM = { title: '', course: '', dueDate: '', type: 'assignment' };

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function dateLabel(date) {
  if (!date) return 'No due date';
  return new Date(`${date}T12:00:00`).toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric'
  });
}

function dueState(task) {
  if (task.completed || !task.dueDate) return '';
  if (task.dueDate < todayKey()) return 'overdue';
  if (task.dueDate === todayKey()) return 'due-today';
  return '';
}

export default function StudentPlanner({ tasks = [], onSaveTask, onUpdateTask, onDeleteTask }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState('');
  const [filter, setFilter] = useState('upcoming');
  const [saving, setSaving] = useState(false);

  const visibleTasks = useMemo(() => tasks
    .filter((task) => filter === 'all' ||
      (filter === 'upcoming' && !task.completed) ||
      (filter === 'completed' && task.completed))
    .sort((a, b) => {
      if (!a.dueDate) return b.dueDate ? 1 : 0;
      if (!b.dueDate) return -1;
      return a.dueDate.localeCompare(b.dueDate);
    }), [filter, tasks]);
  const pendingCount = tasks.filter((task) => !task.completed).length;
  const overdueCount = tasks.filter((task) => dueState(task) === 'overdue').length;

  function startEditing(task) {
    setEditingId(task.id);
    setForm({ title: task.title, course: task.course || '', dueDate: task.dueDate || '', type: task.type });
  }

  function resetForm() {
    setEditingId('');
    setForm(EMPTY_FORM);
  }

  async function submit(event) {
    event.preventDefault();
    setSaving(true);
    try {
      const saved = await onSaveTask(form, editingId);
      if (saved) resetForm();
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="panel planner-panel" id="planner" aria-labelledby="planner-title">
      <header className="planner-heading">
        <div>
          <div className="panel-kicker">YOUR STUDENT LIFE, IN ONE PLACE</div>
          <h2 id="planner-title">Study planner</h2>
          <p>Keep assignments, exams, and study sessions moving forward.</p>
        </div>
        <div className="planner-summary" aria-label={`${pendingCount} tasks remaining`}>
          <strong>{pendingCount}</strong><span>to do</span>
          {overdueCount > 0 && <small>{overdueCount} overdue</small>}
        </div>
      </header>

      <form className="planner-form" onSubmit={submit}>
        <label className="planner-title-field">
          <span>{editingId ? 'Edit task' : 'What do you need to do?'}</span>
          <input
            required
            maxLength="120"
            placeholder="e.g. Review chapter 4"
            value={form.title}
            onChange={(event) => setForm({ ...form, title: event.target.value })}
          />
        </label>
        <label>
          <span>Course</span>
          <input
            maxLength="60"
            placeholder="e.g. Biology"
            value={form.course}
            onChange={(event) => setForm({ ...form, course: event.target.value })}
          />
        </label>
        <label>
          <span>Type</span>
          <select value={form.type} onChange={(event) => setForm({ ...form, type: event.target.value })}>
            {TASK_TYPES.map((type) => <option value={type.value} key={type.value}>{type.label}</option>)}
          </select>
        </label>
        <label>
          <span>Due date</span>
          <input
            type="date"
            value={form.dueDate}
            onChange={(event) => setForm({ ...form, dueDate: event.target.value })}
          />
        </label>
        <div className="planner-form-actions">
          <button className="button button-dark" disabled={saving}>
            {editingId ? <Check size={15} /> : <Plus size={15} />}
            {saving ? 'Saving…' : editingId ? 'Save changes' : 'Add task'}
          </button>
          {editingId && <button className="button button-outline" type="button" onClick={resetForm}><X size={15} /> Cancel</button>}
        </div>
      </form>

      <div className="planner-toolbar">
        <div className="planner-filters" role="group" aria-label="Filter study tasks">
          {[['upcoming', 'To do'], ['all', 'All tasks'], ['completed', 'Completed']].map(([value, label]) => (
            <button
              className={filter === value ? 'planner-filter active' : 'planner-filter'}
              type="button"
              onClick={() => setFilter(value)}
              aria-pressed={filter === value}
              key={value}
            >{label}</button>
          ))}
        </div>
        <span className="planner-task-count">{visibleTasks.length} {visibleTasks.length === 1 ? 'task' : 'tasks'}</span>
      </div>

      {visibleTasks.length ? (
        <ul className="planner-list">
          {visibleTasks.map((task) => {
            const state = dueState(task);
            return (
              <li className={`planner-task ${task.completed ? 'is-complete' : ''}`} key={task.id}>
                <button
                  type="button"
                  className="planner-complete"
                  aria-label={task.completed ? `Mark ${task.title} as not completed` : `Mark ${task.title} as completed`}
                  onClick={() => onUpdateTask(task.id, { completed: !task.completed })}
                >
                  {task.completed ? <Check size={15} /> : <Circle size={17} />}
                </button>
                <div className="planner-task-main">
                  <strong>{task.title}</strong>
                  <span className="planner-task-meta">
                    <span><BookOpen size={12} /> {task.course || 'Personal study'}</span>
                    <span className={`planner-type type-${task.type}`}><ClipboardList size={12} /> {TASK_TYPES.find((type) => type.value === task.type)?.label || 'Study'}</span>
                    <span className={state}><CalendarDays size={12} /> {dateLabel(task.dueDate)}{state === 'overdue' ? ' · overdue' : state === 'due-today' ? ' · today' : ''}</span>
                  </span>
                </div>
                <div className="planner-task-actions">
                  {!task.completed && <button type="button" className="icon-button" aria-label={`Edit ${task.title}`} onClick={() => startEditing(task)}><Pencil size={15} /></button>}
                  <button type="button" className="icon-button planner-delete" aria-label={`Delete ${task.title}`} onClick={() => onDeleteTask(task.id)}><Trash2 size={15} /></button>
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="planner-empty">
          <span><Clock3 size={19} /></span>
          <strong>{filter === 'completed' ? 'No completed tasks yet.' : filter === 'all' ? 'Your planner is ready.' : 'You’re all caught up.'}</strong>
          <p>{filter === 'upcoming' ? 'Add an assignment, exam, or study session above to plan your next step.' : 'Tasks you add will appear here with their course and due date.'}</p>
        </div>
      )}
    </section>
  );
}
