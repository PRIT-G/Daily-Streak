import { Router } from 'express';
import mongoose from 'mongoose';
import { requireAuth } from '../middleware/auth.js';
import {
  createStudentTask,
  deleteStudentTask,
  listStudentTasks,
  updateStudentTask
} from '../services/studentTaskService.js';

const router = Router();
const taskTypes = new Set(['assignment', 'exam', 'study']);
const taskFields = new Set(['title', 'course', 'dueDate', 'type', 'completed']);

router.use(requireAuth);

function validateTaskInput(body, partial = false) {
  const entries = Object.entries(body || {});
  if (!entries.length || entries.some(([key]) => !taskFields.has(key))) {
    return { error: 'Provide valid task fields.' };
  }

  const input = {};
  if (!partial || Object.hasOwn(body, 'title')) {
    const title = String(body.title || '').trim();
    if (!title || title.length > 120) return { error: 'Task title must be between 1 and 120 characters.' };
    input.title = title;
  }
  if (Object.hasOwn(body, 'course')) {
    if (typeof body.course !== 'string' || body.course.trim().length > 60) {
      return { error: 'Course name must be 60 characters or fewer.' };
    }
    input.course = body.course.trim();
  }
  if (!partial || Object.hasOwn(body, 'dueDate')) {
    const dueDate = body.dueDate === undefined || body.dueDate === null ? '' : body.dueDate;
    const parsedDate = typeof dueDate === 'string' && dueDate
      ? new Date(`${dueDate}T00:00:00.000Z`)
      : null;
    if (typeof dueDate !== 'string' ||
        (dueDate && (!/^\d{4}-\d{2}-\d{2}$/.test(dueDate) ||
          !Number.isFinite(parsedDate?.getTime()) ||
          parsedDate.toISOString().slice(0, 10) !== dueDate))) {
      return { error: 'Enter a valid due date.' };
    }
    input.dueDate = dueDate;
  }
  if (!partial || Object.hasOwn(body, 'type')) {
    const type = body.type === undefined ? 'study' : body.type;
    if (!taskTypes.has(type)) return { error: 'Task type must be assignment, exam, or study.' };
    input.type = type;
  }
  if (Object.hasOwn(body, 'completed')) {
    if (typeof body.completed !== 'boolean') return { error: 'Task completion must be true or false.' };
    input.completed = body.completed;
  }
  return { input };
}

router.get('/', async (req, res, next) => {
  try {
    return res.json({ tasks: await listStudentTasks(req.userId) });
  } catch (error) {
    return next(error);
  }
});

router.post('/', async (req, res, next) => {
  const validation = validateTaskInput(req.body);
  if (validation.error) return res.status(400).json({ error: validation.error });
  try {
    return res.status(201).json({ task: await createStudentTask(req.userId, validation.input) });
  } catch (error) {
    return next(error);
  }
});

router.patch('/:taskId', async (req, res, next) => {
  if (!mongoose.isValidObjectId(req.params.taskId)) {
    return res.status(400).json({ error: 'Task id is invalid.' });
  }
  const validation = validateTaskInput(req.body, true);
  if (validation.error) return res.status(400).json({ error: validation.error });
  try {
    const task = await updateStudentTask(req.userId, req.params.taskId, validation.input);
    if (!task) return res.status(404).json({ error: 'Task not found.' });
    return res.json({ task });
  } catch (error) {
    return next(error);
  }
});

router.delete('/:taskId', async (req, res, next) => {
  if (!mongoose.isValidObjectId(req.params.taskId)) {
    return res.status(400).json({ error: 'Task id is invalid.' });
  }
  try {
    const deleted = await deleteStudentTask(req.userId, req.params.taskId);
    if (!deleted) return res.status(404).json({ error: 'Task not found.' });
    return res.status(204).end();
  } catch (error) {
    return next(error);
  }
});

export default router;
