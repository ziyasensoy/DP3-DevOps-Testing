# DP3 DevOps & Testing: Research and Reflection

## 1. What I built (OR2)

For my Study Planner project I set up a CI/CD pipeline with GitHub Actions. It runs on every push and pull request to `main`, in six jobs:

```
build → lint → test → deploy staging → deploy production → rollback production
```

1. **Build**: installs the dependencies and the Playwright browser once, and passes them to the next jobs with a cache. It builds the Docker image, checks that `/health` answers, scans the image with Trivy and pushes it to GitHub Container Registry, tagged with the commit id.
2. **Lint**: ESLint checks code style and common mistakes. `npm audit` checks the app's dependencies for high or critical vulnerabilities.
3. **Test**: all tests in one place. First the unit and integration tests with Jest (fails below 80% coverage), then the end-to-end tests with Playwright.
4. **Deploy staging**: deploys the image of this commit to a staging environment on Render, and waits until staging really runs that commit.
5. **Deploy production**: only starts after I approve it manually in GitHub. It remembers which version production runs now, deploys the same image as staging, checks the version and runs a smoke test on the page and the API. Only then is the image tagged `latest`.
6. **Rollback production**: only runs when the production deploy fails. It automatically puts the previous version back, without waiting for approval, and checks that production works again.

Each job only runs if the one before it passed (`needs:`), except the rollback, which only runs when the production deploy fails. Pull requests run build, lint and test, but are never deployed.

The app is also containerised. The Dockerfile only installs production dependencies, runs as a non-root user, has a `HEALTHCHECK` and doesn't include npm (see section 6).

## 2. Testing approach

I followed the **testing pyramid**: many small, fast unit tests at the bottom and a few slower tests at the top.

| Level       | Tool             | What it tests                                                    |
| ----------- | ---------------- | ---------------------------------------------------------------- |
| Unit        | Jest             | Task validation, deadline countdown, urgency score, task service |
| Integration | Jest + Supertest | API routes, status codes, error responses                        |
| End-to-end  | Playwright       | Page loads, add a task, mark a task as done, delete a task       |
| Smoke       | curl in CI       | The built Docker container starts and answers `/health`          |
| Security    | npm audit, Trivy | Known vulnerabilities in dependencies and in the Docker image    |

Result: 45 Jest tests with 100% line coverage and about 94% branch coverage, plus 4 end-to-end tests. I set a coverage threshold of 80% instead of 100%. Chasing 100% often leads to tests that only exist to hit a line and don't check anything useful.

In the e2e tests I create the task through the API first, and only then use the browser for the thing I'm testing (for example deleting it). This keeps each test short and focused. Each test also uses a unique title, because all tests share the same in-memory server.

## 3. Review of my testing approach

**What works well**

- Each level catches a different kind of problem. Unit tests check the logic, integration tests check the API, e2e tests check the real page, and the scans check code I didn't write myself.
- Most tests are fast unit and integration tests, so the feedback is quick. The slower e2e tests only cover the main user flows.
- The tests run automatically on every push, and a failing test stops the deploy.

**Trade-offs I made, and what I would do next**

| Trade-off                                     | Why it's fine for now                                                 | Next step                                                       |
| --------------------------------------------- | --------------------------------------------------------------------- | --------------------------------------------------------------- |
| E2E tests only run in Chromium                | The page only uses standard HTML and JavaScript, and it keeps CI fast | Add Firefox and WebKit as extra Playwright projects             |
| Coverage is only measured for the server code | The page's main features are covered by the e2e tests                 | Measure frontend coverage too                                   |
| CI retries a failed e2e test once             | Avoids a red pipeline from a one-off timing issue                     | Check the Playwright report for tests that keep needing a retry |
| No load tests                                 | It's a small app with few users                                       | Add a simple load test (for example with k6) if it grows        |

## 4. Research: which tools could I use? (OR1)

**CI/CD tools**

| Tool           | Pros                                                  | Cons                                                |
| -------------- | ----------------------------------------------------- | --------------------------------------------------- |
| GitHub Actions | Built into GitHub, free for public repos, simple YAML | Tied to GitHub                                      |
| GitLab CI      | Very complete, built-in container registry            | My code is on GitHub, so I'd need to move or mirror |
| Jenkins        | Very flexible, self-hosted, lots of plugins           | I have to host and maintain a server myself         |
| CircleCI       | Fast, good caching                                    | Another external account, limited free tier         |

I chose **GitHub Actions** because my repo is already on GitHub and it needs no extra server or account. For the same reason I used **GitHub Container Registry** instead of Docker Hub: it works with the built-in `GITHUB_TOKEN`, so I don't have to store a password as a secret.

**Test tools**

- **Jest vs Mocha/Chai**: Jest has the test runner, assertions, mocking and coverage all in one, so there's less setup. Mocha needs extra libraries for those.
- **Supertest**: lets me call the Express app in the test without starting a real server. That makes the integration tests fast and reliable.
- **Playwright vs Cypress**: both test the real page in a browser. I chose Playwright because it waits for elements by itself (fewer flaky tests), supports several browsers, and can start my server before the tests (`webServer` in the config).

**Hosting**

| Option               | Pros                                                         | Cons                                       |
| -------------------- | ------------------------------------------------------------ | ------------------------------------------ |
| Render               | Free plan, runs a Docker image from a registry, deploy hooks | Free services sleep after about 15 minutes |
| Azure Container Apps | Professional, scales well, student credit available          | More setup (resource groups, credentials)  |
| Fly.io               | Fast, runs Docker images                                     | No real free plan anymore                  |

I chose **Render** because it can run my existing image from GitHub Container Registry without a credit card, and a deploy hook is easy to call from the pipeline. For a small project, sleeping services are an acceptable downside.

**Security tools**

- **npm audit**: built into npm, no setup. It only checks npm packages.
- **Trivy vs Snyk**: both scan Docker images. Trivy is free, open source and doesn't need an account, so it was the easiest to add to the pipeline.

## 5. Critical attitude (AA2)

### 5.1 Questioning my own solution

My pipeline now builds, tests and deploys to staging and production. Looking at it critically, these are the points I'd question:

| Point                      | Why I question it                                                                                       | What I would do                                                        |
| -------------------------- | ------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| **The rollback only knows the smoke test** | It only starts when the deploy or the smoke test fails. A bug found later isn't caught. | Re-run the `deploy-production` job of an older green run (possible up to 30 days), or add more checks to the smoke test. |
| **Rollback by tag, not digest** | The rollback deploys the image by its commit id tag. Tags can in theory be overwritten, a digest can't. | My pipeline never overwrites a commit tag, so it's safe for now. A digest would be stricter. |
| **Render's free plan**     | Services sleep after about 15 minutes, so the first visit is slow. Fine for school, not for real users. | Use a paid plan or another host for a real product.                    |
| **In-memory data**         | Every deploy or restart deletes all tasks, and the tests can't check that data is saved.                | Add a database and integration tests against it.                       |
| **Coverage isn't quality** | High coverage only shows the code was run, not that the tests catch bugs.                               | Mutation testing (for example Stryker).                                |
| **One big cache**          | All jobs depend on one ~290 MB cache. Once, a download failed and the test job went red.                | Fall back to installing the packages when the cache can't be restored. |

### 5.2 Questioning AI output

I used an AI coding assistant (Claude Code) to help build the pipeline. I treated its output as a suggestion, not as the truth:

- **It made a wrong claim.** It said renaming the workflow would break the CI badge in my README. When I asked to rename it anyway, it turned out to be wrong: the badge uses the file name `ci.yml`, not the workflow name.
- **I checked its explanations against the logs.** When the test job failed on the cache, I didn't just accept "it's a network problem". The logs showed that the lint job in the same run restored exactly the same cache, so the cause couldn't be my config.
- **I made my own decisions.** For example, I chose my own commit convention (`build:` for pipeline changes) instead of the types the AI suggested.

### 5.3 Questioning sources and tool output

- **A misleading error message.** Render said "No public image found, you may be using a private image". My image _was_ public: it could be downloaded without logging in. The real cause was that I used the short commit id, while the pipeline tags images with the full id.
- **Not every warning needs the same fix.** Trivy reported HIGH vulnerabilities. Instead of updating random packages, I checked where they were: all inside npm from the base image, not in my code. So the right fix was to remove npm from the image.
- **Checking my rollback against a guide.** I compared my rollback with a guide on rollback jobs in CI/CD. My job already met its best practices (conditional, redeploys a stored image, verifies the result). The guide also warns against separate rollback pipelines, so I dropped my idea of a separate manual rollback workflow.
- **Not every finding is relevant.** `npm audit` reports issues in my dev tools, but those never end up in the image. I only fail the pipeline on production dependencies.

### 5.4 Questioning the problem statement and my own assumptions

- **"Publishing is deploying."** I assumed pushing the image to a registry counted as CD. The feedback showed me that nothing was actually running anywhere, so I added real deploys to staging and production.
- **"A green deploy job means the new version is live."** Calling Render's deploy hook only _starts_ a deploy. So the deploy jobs now check `/health` until it shows the new commit id.
- **My own new plan.** After the feedback I planned to push the image in the build job. While working it out, it became clear that this job runs _before_ the tests, so an untested image would be published as `latest`. I changed it: the build job only pushes the commit id tag, and only the production job adds `latest`.
- **"High coverage means good tests."** 100% line coverage looked great, but it only proves the code ran. That's why I list mutation testing as a next step.

## 6. How the pipeline grew

The first version of my pipeline only ran lint, tests and a Docker build. It had no end-to-end tests, no security checks, and the image was not published anywhere. I improved that step by step:

| What was missing | What I added                                                                                                            |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Publishing       | The image is pushed to GitHub Container Registry. Later I added real deploys to staging and production (see section 7). |
| E2E tests        | 4 Playwright tests in the pipeline.                                                                                     |
| Security checks  | `npm audit` in the lint stage and a Trivy scan before the image is pushed.                                              |

**The Trivy scan found a real problem.** The first time it ran, the pipeline went red with several HIGH vulnerabilities. They were all inside npm, which comes with the `node:22-alpine` base image. My app doesn't need npm to run, so I removed it from the image after installing the dependencies. The next run was green. The scan also stopped the unsafe image from being pushed, which is exactly what it's for.

**A choice I made:** `npm audit` only checks production dependencies (`--omit=dev`). The dev tools (Jest, ESLint) have some reported issues, but they never end up in the image. Failing the pipeline on those would mostly create noise.

## 7. Feedback and the new pipeline

On 3 November I got feedback from my learning group teacher.

| Before                           | After                                                                       |
| -------------------------------- | --------------------------------------------------------------------------- |
| Every job ran `npm ci` again     | One **build** job installs everything; the other jobs reuse it from a cache |
| Separate `e2e` job               | All tests in one **test** job                                               |
| Separate `docker` job at the end | Docker build, smoke test and Trivy scan are part of the **build** job       |
| Image only published             | **Deploy staging** and **deploy production** on Render                      |
| Nothing happened when a deploy failed | An automatic **rollback** job at the end of the pipeline (my teacher asked for this later) |

Some choices I made along the way:

- **The commit id is in the image.** `/health` shows which commit is running. The deploy jobs wait until Render really runs the new commit, instead of only trusting that the deploy hook was called.
- **Only the commit id tag is pushed in the build job.** The build job runs before lint and tests, so I don't tag that image `latest`. Only the production job adds `latest`, so `latest` always means "what runs in production". An image that failed the tests can be in the registry, but it's never deployed.
- **Staging and production get exactly the same image.** So what I checked on staging is what goes live.
- **The environments only accept `main`.** Even if someone changed the workflow, another branch can't deploy.
- **Secrets stay in GitHub.** The Render deploy hooks are environment secrets, not in the code.

**A problem I ran into:** once, the test job couldn't download the cache, although the lint job in the same run could. It was a one-off network problem at GitHub, and re-running the job fixed it. It showed me that `fail-on-cache-miss` makes the pipeline fail loudly, which I prefer over silently running without packages.

## 8. Validation and quality evaluation (OR4)

### Does the solution do what it should?

For every goal of the pipeline I checked _how_ it is validated and what the result was.

| Goal                                         | How it is validated                                                    | Result                                                                       |
| -------------------------------------------- | ---------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| Code style mistakes are caught               | ESLint in the lint job, on every push                                  | ✅ Passes in every run                                                       |
| The task logic is correct                    | 45 unit and integration tests, coverage threshold of 80%               | ✅ 100% lines                                                                |
| The page works for a user                    | 4 Playwright tests: load page, add, mark as done, delete               | ✅ All pass                                                                  |
| The Docker image actually starts             | Smoke test on `/health` in the build job                               | ✅ Passes                                                                    |
| No image with known vulnerabilities goes out | Trivy scan before the push                                             | ✅ Proven: the scan went red and blocked the push, then passed after the fix |
| The right version is deployed                | Deploy jobs compare the commit in `/health` with the commit of the run | ✅ Production showed exactly the commit of the run                           |
| Nothing goes live without my approval        | GitHub Environment `production` with a required reviewer               | ✅ The job waited until I approved it                                        |
| A failed production deploy is undone         | A commit with `[simulate failure]` makes the deploy fail on purpose    | ✅ The rollback started by itself and production ran the previous commit again |
| Only `main` can deploy                       | Branch rule on both environments + `if:` in the workflow               | ✅ Set up, not yet tried with another branch                                 |

### Quality in numbers

- **Reliability:** 25 pipeline runs so far. 23 were green. Both red runs were on purpose: the Trivy scan that found vulnerabilities, and the rollback test. Once, a test job failed because it couldn't download the cache. Re-running it fixed it.
- **Speed:** a full run takes about 2–3 minutes without the approval. Build takes 30–50 s, lint 10–15 s, test 25–60 s (the slowest, because of the browser tests) and each deploy 20–30 s.
- **Deploys:** the deploy jobs don't just call Render, they check the running version. So a green deploy job really means the new version is live.

## 9. What I learned

- Splitting the pipeline into stages makes it clear _where_ something broke.
- Different kinds of tests catch different problems. Unit tests check the logic, integration tests check the API, e2e tests check what the user actually sees, and security scans check the things I didn't write myself.
- Docker makes "it works on my machine" testable: the pipeline runs the same image I run locally, on staging and in production.
- A deploy isn't finished when it's started. The pipeline has to check the result, and undo it automatically when it goes wrong.
- Publishing is not deploying. Feedback made me see that a pipeline only really delivers when the app ends up running somewhere.
