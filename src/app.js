const express = require("express");
const { createTaskService, ValidationError } = require("./taskService");
const { version } = require("../package.json");

function createApp(service = createTaskService()) {
  const app = express();
  app.use(express.json());

  // Health check used by Docker HEALTHCHECK and the pipeline smoke test.
  app.get("/health", (req, res) => {
    res.json({ status: "ok", version, commit: process.env.GIT_SHA || "local" });
  });

  app.get("/api/tasks", (req, res) => res.json(service.list()));

  app.post("/api/tasks", (req, res) => {
    res.status(201).json(service.create(req.body));
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
