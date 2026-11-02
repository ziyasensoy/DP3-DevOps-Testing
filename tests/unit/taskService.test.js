// Unit tests
const {
  createTaskService,
  validateTask,
  urgencyScore,
  daysUntil,
  ValidationError,
} = require("../../src/taskService");

const NOW = new Date(2026, 10, 3, 12, 0, 0); // 3 Nov 2026, 12:00 local

describe("validateTask", () => {
  test("accepts a minimal valid task", () => {
    expect(validateTask({ title: "Write reflection" })).toEqual([]);
  });

  test.each([
    [null, "Task must be an object"],
    [{}, "Title is required"],
    [{ title: "   " }, "Title is required"],
    [{ title: "x".repeat(101) }, "Title must be at most 100 characters"],
    [{ title: "a", deadline: "not-a-date" }, "Deadline must be a valid date"],
    [
      { title: "a", priority: "urgent" },
      "Priority must be one of: low, medium, high",
    ],
    [
      { title: "a", estimatedHours: 0 },
      "Estimated hours must be a number between 0 and 100",
    ],
    [
      { title: "a", estimatedHours: 101 },
      "Estimated hours must be a number between 0 and 100",
    ],
    [
      { title: "a", estimatedHours: "3" },
      "Estimated hours must be a number between 0 and 100",
    ],
  ])("rejects %j", (input, message) => {
    expect(validateTask(input)).toContain(message);
  });

  test("title of exactly 100 characters is allowed", () => {
    expect(validateTask({ title: "x".repeat(100) })).toEqual([]);
  });

  test("estimatedHours of exactly 100 is allowed", () => {
    expect(validateTask({ title: "a", estimatedHours: 100 })).toEqual([]);
  });

  test("reports multiple errors at once", () => {
    expect(validateTask({ title: "", priority: "x" })).toHaveLength(2);
  });
});

describe("daysUntil", () => {
  test("returns null without a deadline", () => {
    expect(daysUntil(null, NOW)).toBeNull();
  });

  test("is 0 for later the same day", () => {
    expect(daysUntil(new Date(2026, 10, 3, 23, 59), NOW)).toBe(0);
  });

  test("is positive for future dates", () => {
    expect(daysUntil(new Date(2026, 10, 10), NOW)).toBe(7);
  });

  test("is negative when overdue", () => {
    expect(daysUntil(new Date(2026, 10, 1), NOW)).toBe(-2);
  });
});

describe("urgencyScore", () => {
  test("completed tasks have zero urgency", () => {
    expect(urgencyScore({ priority: "high", done: true }, NOW)).toBe(0);
  });

  test("defaults to medium priority", () => {
    expect(urgencyScore({}, NOW)).toBe(25);
  });

  test("overdue high-priority beats far-away high-priority", () => {
    const overdue = urgencyScore(
      { priority: "high", deadline: new Date(2026, 10, 1) },
      NOW,
    );
    const later = urgencyScore(
      { priority: "high", deadline: new Date(2026, 11, 20) },
      NOW,
    );
    expect(overdue).toBeGreaterThan(later);
  });

  test.each([
    [0, 45],
    [1, 35],
    [2, 35],
    [5, 20],
    [7, 20],
    [8, 5],
  ])("deadline in %i days adds %i points", (days, expected) => {
    const deadline = new Date(2026, 10, 3 + days);
    expect(urgencyScore({ priority: "low", deadline }, NOW)).toBe(10 + expected);
  });

  test("workload contribution is capped at 10", () => {
    expect(urgencyScore({ priority: "low", estimatedHours: 50 }, NOW)).toBe(20);
  });

  test("score never exceeds 100", () => {
    const score = urgencyScore(
      { priority: "high", deadline: new Date(2026, 0, 1), estimatedHours: 99 },
      NOW,
    );
    expect(score).toBeLessThanOrEqual(100);
  });
});

describe("createTaskService", () => {
  let service;
  beforeEach(() => {
    service = createTaskService();
  });

  test("creates tasks with defaults and incrementing ids", () => {
    const a = service.create({ title: "  First  " });
    const b = service.create({ title: "Second" });
    expect(a).toMatchObject({
      id: 1,
      title: "First",
      priority: "medium",
      done: false,
      deadline: null,
    });
    expect(b.id).toBe(2);
  });

  test("throws ValidationError on invalid input", () => {
    expect(() => service.create({ title: "" })).toThrow(ValidationError);
  });

  test("list is sorted by urgency, highest first", () => {
    service.create({ title: "Low later", priority: "low" });
    service.create({
      title: "High overdue",
      priority: "high",
      deadline: new Date(2026, 10, 1),
    });
    const titles = service.list(NOW).map((t) => t.title);
    expect(titles).toEqual(["High overdue", "Low later"]);
  });

  test("update changes fields and validates", () => {
    const t = service.create({ title: "Task" });
    expect(service.update(t.id, { done: true }).done).toBe(true);
    expect(() => service.update(t.id, { priority: "nope" })).toThrow(
      ValidationError,
    );
    expect(() => service.update(t.id, { done: "yes" })).toThrow(
      "Done must be true or false",
    );
  });

  // Regression test: tasks created without optional fields store them as null,
  // which used to make every later update fail validation.
  test("regression: a task without hours/deadline can still be updated", () => {
    const t = service.create({ title: "No optional fields" });
    expect(() => service.update(t.id, { title: "Renamed" })).not.toThrow();
  });

  test("update returns null for unknown id", () => {
    expect(service.update(999, { title: "x" })).toBeNull();
  });

  test("remove deletes a task once", () => {
    const t = service.create({ title: "Task" });
    expect(service.remove(t.id)).toBe(true);
    expect(service.remove(t.id)).toBe(false);
    expect(service.get(t.id)).toBeNull();
  });
});
