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

Every build on `main` publishes the image to GitHub Container Registry, tagged with the commit id. The version that runs in production is also tagged `latest`:

```bash
docker run -d -p 3000:3000 ghcr.io/ziyasensoy/study-planner:latest
```

## Live environments

The app runs on [Render](https://render.com) :

| Environment | URL                                           |
| ----------- | --------------------------------------------- |
| Staging     | https://study-planner-staging.onrender.com    |
| Production  | https://study-planner-production.onrender.com |

`/health` shows which commit is running.

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

| Method | Route            | What it does    |
| ------ | ---------------- | --------------- |
| GET    | `/health`        | Health check    |
| GET    | `/api/tasks`     | List all tasks  |
| GET    | `/api/tasks/:id` | Get one task    |
| POST   | `/api/tasks`     | Create a task   |
| PATCH  | `/api/tasks/:id` | Update a task   |
| DELETE | `/api/tasks/:id` | Delete a task   |
| GET    | `/api/stats`     | Task statistics |

## CI/CD pipeline

GitHub Actions (`.github/workflows/ci.yml`) runs on every push and pull request to `main`:

```
build → lint → test → deploy staging → deploy production → rollback production
```

1. **Build**: installs the dependencies and the Playwright browser, and caches them for the next jobs. Builds the Docker image, checks that `/health` answers, and scans the image with Trivy. On `main` it pushes the image to GitHub Container Registry.
2. **Lint**: ESLint checks the code, and `npm audit` checks the app's dependencies for high or critical vulnerabilities.
3. **Test**: runs unit and integration tests with coverage (fails below 80%), then the Playwright end-to-end tests. Uploads both reports.
4. **Deploy staging**: deploys the image of this commit to Render, and waits until staging runs that commit.
5. **Deploy production**: needs a manual approval in GitHub first. Remembers the version that runs now, deploys the same image as staging, checks the version and smoke tests the page and the API. Then tags the image `latest`.
6. **Rollback production**: only runs when the production deploy fails. Deploys the previous version again, without approval, and checks that production works.

Each job only runs if the one before it passed, except the rollback, which only runs when the production deploy fails. Pull requests run build, lint and test, but are never deployed.

To test the rollback, push a commit with `[simulate failure]` in its message, for example:

```bash
git commit --allow-empty -m "test: check that the rollback works [simulate failure]"
```

The production deploy then fails on purpose and the rollback job takes over.
