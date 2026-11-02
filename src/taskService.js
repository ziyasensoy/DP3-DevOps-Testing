// Business logic for study tasks.

const VALID_PRIORITIES = ["low", "medium", "high"];

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

module.exports = { validateTask, ValidationError };
