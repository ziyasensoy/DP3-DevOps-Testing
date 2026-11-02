const path = require("path");
const express = require("express");
const { createTaskService, ValidationError } = require("./taskService");
const { version } = require("../package.json");

function createApp(service = createTaskService()) {
  const app = express();
  app.use(express.json());
  app.use(express.static(path.join(__dirname, "public")));

  // Health check used by Docker HEALTHCHECK and the pipeline smoke test.
  app.get("/health", (req, res) => {
    res.json({ status: "ok", version, commit: process.env.GIT_SHA || "local" });
  });

  app.get("/api/tasks", (req, res) => res.json(service.list()));

  app.get("/api/stats", (req, res) => res.json(service.stats()));

  app.get("/api/tasks/:id", (req, res) => {
    const task = service.get(Number(req.params.id));
    if (!task) return res.status(404).json({ error: "Task not found" });
    res.json(task);
  });

  app.post("/api/tasks", (req, res) => {
    res.status(201).json(service.create(req.body));
  });

  app.patch("/api/tasks/:id", (req, res) => {
    const task = service.update(Number(req.params.id), req.body || {});
    if (!task) return res.status(404).json({ error: "Task not found" });
    res.json(task);
  });

  app.delete("/api/tasks/:id", (req, res) => {
    if (!service.remove(Number(req.params.id))) {
      return res.status(404).json({ error: "Task not found" });
    }
    res.status(204).end();
  });

  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    if (err instanceof ValidationError) {
      return res.status(400).json({ error: err.message });
    }
    if (err.type === "entity.parse.failed") {
      return res.status(400).json({ error: "Invalid JSON" });
    }
    res.status(500).json({ error: "Internal server error" });
  });

  return app;
}

module.exports = { createApp };
