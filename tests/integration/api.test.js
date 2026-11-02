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
  test("full CRUD flow", async () => {
    const created = await request(app)
      .post("/api/tasks")
      .send({ title: "Prepare DP3 demo", priority: "high", estimatedHours: 3 });
    expect(created.status).toBe(201);
    const { id } = created.body;

    const list = await request(app).get("/api/tasks");
    expect(list.body).toHaveLength(1);
    expect(list.body[0]).toHaveProperty("urgency");

    const one = await request(app).get(`/api/tasks/${id}`);
    expect(one.body.title).toBe("Prepare DP3 demo");

    const patched = await request(app)
      .patch(`/api/tasks/${id}`)
      .send({ done: true });
    expect(patched.body.done).toBe(true);

    const stats = await request(app).get("/api/stats");
    expect(stats.body).toMatchObject({ total: 1, done: 1 });

    expect((await request(app).delete(`/api/tasks/${id}`)).status).toBe(204);
    expect((await request(app).get(`/api/tasks/${id}`)).status).toBe(404);
  });

  test("PATCH on unknown id returns 404", async () => {
    const res = await request(app).patch("/api/tasks/42").send({ title: "x" });
    expect(res.status).toBe(404);
  });

  test("PATCH with invalid data returns 400", async () => {
    const { body } = await request(app).post("/api/tasks").send({ title: "x" });
    const res = await request(app)
      .patch(`/api/tasks/${body.id}`)
      .send({ priority: "urgent" });
    expect(res.status).toBe(400);
  });

  test("DELETE on unknown id returns 404", async () => {
    expect((await request(app).delete("/api/tasks/42")).status).toBe(404);
  });

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
