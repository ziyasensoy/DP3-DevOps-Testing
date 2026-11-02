# Study Planner

![CI/CD](https://github.com/ziyasensoy/DP3-DevOps-Testing/actions/workflows/ci.yml/badge.svg)

A small study-task planner made for DP3 DevOps & Testing. It's an Express API with a simple web page. You can add study tasks with a deadline and the hours they need, mark them as done, and see stats. The project shows a CI/CD pipeline and a testing approach.

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

Every green build on `main` also publishes the image to GitHub Container Registry:

```bash
docker run -d -p 3000:3000 ghcr.io/ziyasensoy/study-planner:latest
```

## Tests

```bash
npm test                  # unit + integration tests
npm run test:unit         # unit tests (task logic)
npm run test:integration  # integration tests (API routes with supertest)
npm run test:coverage     # tests + coverage, fails below 80%
npm run test:e2e          # end-to-end tests in a real browser (Playwright)
npm run lint              # ESLint
```

Before the first e2e run, install the browser once with `npx playwright install chromium`.

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

## CI/CD pipeline

GitHub Actions (`.github/workflows/ci.yml`) runs on every push and pull request to `main`:

1. **Lint**: ESLint checks the code, and `npm audit` checks the app's dependencies for high or critical vulnerabilities.
2. **Test**: runs unit and integration tests with coverage (fails below 80%), and uploads the coverage report.
3. **E2E**: runs the Playwright tests in Chromium, and uploads the Playwright report.
4. **Docker**: builds the image, checks that `/health` answers, and scans the image with Trivy. On `main` it then pushes the image to GitHub Container Registry.

Each stage only runs if the one before it passed.
