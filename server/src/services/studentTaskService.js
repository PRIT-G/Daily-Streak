import StudentTask from '../models/StudentTask.js';

function taskResponse(task) {
  return {
    id: task._id.toString(),
    title: task.title,
    course: task.course,
    dueDate: task.dueDate,
    type: task.type,
    completed: task.completed,
    createdAt: task.createdAt,
    updatedAt: task.updatedAt,
  };
}

export async function listStudentTasks(userId) {
  const tasks = await StudentTask.find({ userId }).sort({ dueDate: 1, createdAt: -1 }).lean();
  return tasks.map(taskResponse);
}

export async function createStudentTask(userId, input) {
  const task = await StudentTask.create({ userId, ...input });
  return taskResponse(task);
}

export async function updateStudentTask(userId, taskId, updates) {
  const task = await StudentTask.findOneAndUpdate(
    { _id: taskId, userId },
    { $set: updates },
    { new: true, runValidators: true }
  );
  return task ? taskResponse(task) : null;
}

export async function deleteStudentTask(userId, taskId) {
  const task = await StudentTask.findOneAndDelete({ _id: taskId, userId });
  return Boolean(task);
}
