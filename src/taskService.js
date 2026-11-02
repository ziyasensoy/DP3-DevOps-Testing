// Business logic for study tasks.

const VALID_PRIORITIES = ["low", "medium", "high"];
const MS_PER_DAY = 24 * 60 * 60 * 1000;

class ValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = "ValidationError";
  }
}

/**
 * Validates raw input for a task and returns a list of error messages (empty = valid).
 */
function validateTask(input) {
  const errors = [];
  if (!input || typeof input !== "object") {
    return ["Task must be an object"];
  }
  if (typeof input.title !== "string" || input.title.trim().length === 0) {
    errors.push("Title is required");
  } else if (input.title.trim().length > 100) {
    errors.push("Title must be at most 100 characters");
  }
  if (input.deadline !== undefined) {
    const date = new Date(input.deadline);
    if (Number.isNaN(date.getTime())) {
      errors.push("Deadline must be a valid date");
    }
  }
  if (
    input.priority !== undefined &&
    !VALID_PRIORITIES.includes(input.priority)
  ) {
    errors.push(`Priority must be one of: ${VALID_PRIORITIES.join(", ")}`);
  }
  if (input.estimatedHours !== undefined) {
    const h = input.estimatedHours;
    if (typeof h !== "number" || !Number.isFinite(h) || h <= 0 || h > 100) {
      errors.push("Estimated hours must be a number between 0 and 100");
    }
  }
  return errors;
}

/**
 * Whole days left until the deadline (negative when overdue, null when no deadline).
 */
function daysUntil(deadline, now = new Date()) {
  if (!deadline) return null;
  const startOfToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
  );
  const d = new Date(deadline);
  const startOfDeadline = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  return Math.round((startOfDeadline - startOfToday) / MS_PER_DAY);
}

/**
 * Urgency score 0–100 used to sort the task list. Combines priority, time left and workload.
 */
function urgencyScore(task, now = new Date()) {
  if (task.done) return 0;
  const priorityWeight = { low: 10, medium: 25, high: 40 }[
    task.priority || "medium"
  ];
  const days = daysUntil(task.deadline, now);

  let timeWeight = 0;
  if (days === null) timeWeight = 0;
  else if (days < 0) timeWeight = 50; // overdue
  else if (days === 0) timeWeight = 45;
  else if (days <= 2) timeWeight = 35;
  else if (days <= 7) timeWeight = 20;
  else timeWeight = 5;

  const hours = task.estimatedHours || 0;
  const workloadWeight = Math.min(10, Math.round(hours));

  return Math.min(100, priorityWeight + timeWeight + workloadWeight);
}

module.exports = { validateTask, urgencyScore, daysUntil, ValidationError };
