# Study Planner

A small study-task planner made for DP3 DevOps & Testing. It's an Express API with a simple web page. You can add study tasks with a deadline and the hours they need, mark them as done, and see stats. The project shows a CI pipeline and a testing approach.

## Run it locally

Needs Node.js 20 or newer.

```bash
npm install
npm start        # http://localhost:3000
npm run dev      # restarts when files change
```

## Run it with Docker

```bash
docker build -t study-planner .
docker run -d --name study-planner -p 3000:3000 study-planner
```

The container runs as a non-root user, and Docker checks `/health` to see if the app is still working.

## Tests

```bash
npm test                  # all tests
npm run test:unit         # unit tests (task logic)
npm run test:integration  # integration tests (API routes with supertest)
npm run test:coverage     # tests + coverage, fails below 80%
npm run lint              # ESLint
```

## API

| Method | Route            | What it does         |
| ------ | ---------------- | -------------------- |
| GET    | `/health`        | Health check         |
| GET    | `/api/tasks`     | List all tasks       |
| GET    | `/api/tasks/:id` | Get one task         |
| POST   | `/api/tasks`     | Create a task        |
| PATCH  | `/api/tasks/:id` | Update a task        |
| DELETE | `/api/tasks/:id` | Delete a task        |
| GET    | `/api/stats`     | Task statistics      |

## CI pipeline

GitHub Actions (`.github/workflows/ci.yml`) runs on every push and pull request to `main`:

1. **Lint**: ESLint checks the code.
2. **Test**: runs unit and integration tests with coverage, and uploads the coverage report.
3. **Docker**: builds the image, starts the container and checks that `/health` answers.
