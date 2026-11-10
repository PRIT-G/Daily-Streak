import { useCallback } from 'react';
import {
  createStudentTask,
  deleteStudentTask,
  updateStudentTask
} from '../features/dashboard/api.js';

export function useTasks({ token, runAction }) {
  const saveStudentTask = useCallback((task, taskId) =>
    runAction(
      () => taskId
        ? updateStudentTask(token, taskId, task)
        : createStudentTask(token, task),
      taskId ? 'Planner task updated.' : 'Task added to your planner.'
    ), [runAction, token]);

  const updateTask = useCallback((taskId, updates) =>
    runAction(() => updateStudentTask(token, taskId, updates), 'Planner task updated.'),
  [runAction, token]);

  const removeTask = useCallback((taskId) =>
    runAction(() => deleteStudentTask(token, taskId), 'Task removed from your planner.'),
  [runAction, token]);

  return {
    saveStudentTask,
    updateTask,
    removeTask
  };
}

