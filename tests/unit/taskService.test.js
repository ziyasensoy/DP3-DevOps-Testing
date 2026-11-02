// Unit tests: business logic in isolation, no HTTP, fixed "now" so results are deterministic.
const { validateTask } = require("../../src/taskService");

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

  // Boundary value analysis
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
