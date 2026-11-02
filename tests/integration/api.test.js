// Integration tests
const request = require("supertest");
const { createApp } = require("../../src/app");

let app;
beforeEach(() => {
  app = createApp(); // fresh in-memory state per test
});

describe("GET /health", () => {
  test("reports ok and the app version", async () => {
    const res = await request(app).get("/health");
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      status: "ok",
      version: expect.any(String),
    });
  });
});

describe("Tasks API", () => {
  test("POST returns 400 with a message for invalid data", async () => {
    const res = await request(app).post("/api/tasks").send({ title: "" });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/Title is required/);
  });

  test("POST returns 400 for malformed JSON", async () => {
    const res = await request(app)
      .post("/api/tasks")
      .set("Content-Type", "application/json")
      .send('{"title": ');
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Invalid JSON");
  });

  test("unexpected errors return 500 without leaking details", async () => {
    const broken = createApp({
      list() {
        throw new Error("database exploded");
      },
    });
    const res = await request(broken).get("/api/tasks");
    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: "Internal server error" });
  });
});
