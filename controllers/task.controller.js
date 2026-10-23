import { Task } from "../models/Task.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/APIError.js";

/* ----------------------------- Get all tasks ----------------------------- */
export const getTasks = asyncHandler(async (req, res) => {
  // These query parameters let the client show a smaller task list.
  const { status, priority, relatedLead } = req.query;

  // Always restrict task results to the authenticated user's tasks.
  const filter = { owner: req.user._id };

  // Add optional filters only when they are present in the request.
  if (status) filter.status = status;
  if (priority) filter.priority = priority;
  if (relatedLead) filter.relatedLead = relatedLead;

  // Sort upcoming tasks first and include useful details for linked records.
  const tasks = await Task.find(filter)
    .sort({ dueDate: 1, createdAt: -1 })
    .populate("relatedLead", "name company")
    .populate("relatedContact", "name company");

  res.json({ success: true, count: tasks.length, tasks });
});

/* ----------------------------- Create task ----------------------------- */
export const createTask = asyncHandler(async (req, res) => {
  // Ownership comes from the logged-in user rather than client input.
  const task = await Task.create({ ...req.body, owner: req.user._id });
  res.status(201).json({ success: true, task });
});

/* ----------------------------- Update task ----------------------------- */
export const updateTask = asyncHandler(async (req, res) => {
  // Prevent clients from moving a task to another user's account.
  const { owner, ...updates } = req.body;

  // Record when a task first becomes completed if no timestamp was supplied.
  if (updates.status === "Completed" && !updates.completedAt) {
    updates.completedAt = new Date();
  }

  // Clear an old completion date when the task is moved back to an active status.
  if (updates.status && updates.status !== "Completed") {
    updates.completedAt = null;
  }

  const task = await Task.findOneAndUpdate(
    // Matching both fields prevents updates to another user's task.
    { _id: req.params.id, owner: req.user._id },
    updates,
    // Return the updated document and validate all changed fields.
    { new: true, runValidators: true }
  );

  // This also hides whether a task with the requested ID belongs to another user.
  if (!task) throw new ApiError(404, "Task not found");
  res.json({ success: true, task });
});

/* ----------------------------- Delete task ----------------------------- */
export const deleteTask = asyncHandler(async (req, res) => {
  // Delete only a task owned by the authenticated user.
  const task = await Task.findOneAndDelete({
    _id: req.params.id,
    owner: req.user._id,
  });

  // Return the same not-found response for missing or inaccessible tasks.
  if (!task) throw new ApiError(404, "Task not found");
  res.json({ success: true, message: "Task deleted" });
});
