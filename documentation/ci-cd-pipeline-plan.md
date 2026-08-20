# CI Pipeline Implementation Plan — trips-left

## Context

`trips-left` (github.com/mjl776/trips-left, confirmed via `git remote -v`) is a monorepo with three independently deployed services — `frontend/` (Next.js, Vercel), `backend/` (NestJS, Railway), `simulation-service/` (FastAPI, Railway/Docker) — and **no CI/CD configured today**: there is no `.github/workflows/` directory and no other CI config anywhere in the repo. PRs are already the merge mechanism (commit history shows `(#50)`, `(#49)`, etc.) but nothing currently verifies a PR before it lands on `main`. Each service already documents its own test command in per-service `CLAUDE.md`/`README.md` files, so the goal here is to codify those already-agreed commands into an automated, per-service-isolated pipeline that blocks bad merges rather than just recording failures after the fact.

This is a planning document only — no code or config has been written yet. It records the approach for review before implementation.

## Recommended platform: GitHub Actions

The repo is hosted on GitHub (confirmed), so GitHub Actions is the natural choice — no new external CI account/integration needed, native PR status checks, native branch-protection integration, and free minutes are ample for a project this size. No existing CI tool to migrate away from.

## Workflow structure

**Single workflow file, three parallel jobs, path-filtered.** Given the explicit requirement "each service should have its own job/stage so failures are isolated and easy to diagnose," a single workflow with independent jobs is the right shape (not three separate workflow files):

- One workflow = one PR status view (all three checks appear together on the PR, easy to see at a glance which service broke).
- Jobs run in parallel by default (no `needs:`), so isolation is preserved — a backend failure doesn't block or hide a frontend failure.
- `paths:` filters (or in-job path-change detection) let each job skip cleanly when its service didn't change, keeping the pipeline fast without needing three separate trigger configs.

File: **`.github/workflows/ci.yml`**

```
.github/
  workflows/
    ci.yml        # single workflow, 3 jobs: frontend, backend, simulation-service
```

## Trigger

Decision: **gate the merge**, not just react after it.

```yaml
on:
  pull_request:
    branches: [main]
    types: [opened, synchronize, reopened]
```

- `pull_request` (not `push`) runs on every commit pushed to a PR targeting `main`, *before* merge — this is what lets a required status check actually block the "Merge" button.
- This is the distinction between "merge-to-main" and "PR-opened" triggers: a `push`-to-`main` trigger only ever runs *after* the merge commit already exists on `main`, so a red build can't stop bad code from landing — it can only tell you after the fact. `pull_request` runs on the PR's own commits pre-merge, which is what "block bad merges" requires.
- `types: [opened, synchronize, reopened]` re-runs checks on every new push to the PR branch (`synchronize`), not just when the PR is first opened.

## Per-service jobs

All three jobs run in parallel, each scoped to skip cleanly when its service's files didn't change in the PR (see Open Questions for the exact filtering mechanism to finalize).

### 1. `frontend` job

- **Runs in:** `frontend/`
- **Setup:** `actions/setup-node@v4` with `node-version: 22`, `cache: npm`, `cache-dependency-path: frontend/package-lock.json`
- **Install:** `npm ci` (in `frontend/`)
- **Commands** (mirrors `frontend/CLAUDE.md`'s own workflow step):
  1. `npm run lint`
  2. `npm run test:run` — this is the single Vitest invocation that covers **both** "unit tests" and "frontend tests" from the requirements. There's no separate unit-vs-component test script in this repo; the split is by folder only (`lib/tests/*.test.ts` for unit, `components/*/index.test.tsx` for component), and both run under the same `vitest.config.mts` (jsdom environment) via one command. Using `npm run test:run` (not `npm run test`, which is Vitest's watch mode and would hang the CI job) is important.
- **Caching:** npm cache via `setup-node`'s built-in `cache: npm`, keyed off `frontend/package-lock.json`.

### 2. `backend` job

- **Runs in:** `backend/`
- **Setup:** `actions/setup-node@v4` with `node-version: 22`, `cache: npm`, `cache-dependency-path: backend/package-lock.json`
- **Install:** `npm ci` (in `backend/`)
- **Commands:**
  1. `npx prisma generate` — required before lint/test/build. The Prisma client is generated to `backend/generated/prisma`, which is gitignored, and `PrismaService` imports directly from that generated path (`backend/src/prisma.service.ts`). Confirmed this step needs **no `DATABASE_URL`** — `prisma generate` only reads `schema.prisma`, it doesn't connect to a database.
  2. `npm run lint`
  3. `npm run test` — unit tests only (`*.test.ts`, colocated with source, jest config inline in `package.json`, `testEnvironment: node`). Confirmed by grep that all backend unit tests (`trade.service.test.ts`, `lineup.service.test.ts`, `league.service.test.ts`, `projections.service.test.ts`, `player.service.test.ts`) use `createMockPrismaService()` to mock `PrismaService` — **no real Postgres instance or `DATABASE_URL` value is needed to run unit tests**, only the generated client's types.
- **Explicitly deferred:** `npm run test:e2e` (separate Jest config at `backend/test/jest-e2e.json`, suffix `*.e2e-spec.ts`) is out of scope for this pipeline — it would need a real Postgres service container and is a larger follow-up.
- **Caching:** npm cache via `setup-node`'s `cache: npm`, keyed off `backend/package-lock.json`. (No Prisma-engine cache needed at this scale; can be revisited if `prisma generate` becomes a bottleneck.)

### 3. `simulation-service` job

- **Runs in:** `simulation-service/`
- **Setup:** `actions/setup-python@v5` with `python-version: '3.11'` (matches `simulation-service/Dockerfile`'s `FROM python:3.11-slim`, satisfies README's stated "3.10+" floor), `cache: pip`, `cache-dependency-path: simulation-service/requirements.txt`
- **Install:** `pip install -r requirements.txt` (no venv needed inside an ephemeral CI runner — the venv step in the README is for local dev)
- **Command:** `python -m pytest tests/ -v` — must be run with `simulation-service/` as the working directory (test file imports `simulation.simulate_trade` directly, no `sys.path` manipulation, so it relies on being run from the service root).
- **No external dependencies to mock/spin up:** confirmed via `simulation-service/CLAUDE.md` — this service is stateless, no DB access, no outbound API calls, pure numpy computation.
- **Caching:** `actions/setup-python`'s built-in `cache: pip`, keyed off `requirements.txt`.

## Status reporting & branch protection

This plan includes configuring branch protection (requires repo admin access on `mjl776/trips-left`):

1. GitHub Settings → Branches → Branch protection rule for `main`.
2. Enable **"Require status checks to pass before merging."**
3. Add all three job names as required checks: `frontend`, `backend`, `simulation-service`.
4. Enable **"Require branches to be up to date before merging"** so stale PRs re-run against latest `main`.
5. Since checks are `pull_request`-triggered and path-filtered, a check that's skipped (no relevant file changes) still needs to report a neutral/success state to avoid permanently blocking merges when e.g. only `simulation-service/` changed — GitHub Actions path-filtered jobs handle this correctly by default when using job-level `if:` conditions (the job shows as "skipped," which counts as passing for required-check purposes), but this should be verified during rollout (see Open Questions).

No separate deploy-status reporting is in scope — this plan only covers test/lint checks, not deployment (Vercel/Railway already auto-deploy from `main` outside this workflow, per the root README's system design section).

## Secrets / environment variables

Grounded in what was actually found — **minimal secrets needed for this scope:**

- **`frontend` job:** none identified. No `.env`-consumed secrets found in `frontend/package.json` scripts for lint/test.
- **`backend` job:** none needed for `prisma generate` + unit tests, since unit tests mock `PrismaService` entirely. (If e2e tests are added later, that job would need `DATABASE_URL`/`DIRECT_URL` — currently blank placeholders in `backend/.env` — likely pointing at a CI-only ephemeral Postgres service container, not the real Supabase instance.)
- **`simulation-service` job:** none — stateless service, no credentials per its own `CLAUDE.md`.

No GitHub Actions secrets need to be created for this initial pipeline. This is worth flagging explicitly since it's a favorable, low-risk starting point — nothing sensitive touches CI yet.

## Rollout order

1. **`simulation-service` first** — simplest job (no lint step, no Node tooling, no Prisma generation, zero secrets), fastest to validate the workflow YAML mechanics (checkout, path filtering, job isolation) work at all.
2. **`frontend` second** — validates Node/npm setup, `npm ci` caching, and confirms `npm run test:run` (not the watch-mode `test`) is correctly wired.
3. **`backend` last** — most complex job (requires the `prisma generate` step before lint/test can even import types), good to validate once the simpler Node-based job pattern is already proven.
4. **Then** enable branch protection required-status-checks once all three jobs have run green on a real PR at least once (enabling required checks before a job has ever passed can lock the repo if the check name is misconfigured).

## Open questions

1. **Path-filtering mechanism:** should each job use a plain `if:` on changed files (via `dorny/paths-filter` action, most common/robust) or should this instead be three separate `on.pull_request.paths` triggered workflows (loses the "single PR check view" but simplifies YAML)? Recommend `dorny/paths-filter` inside the single workflow — confirm before implementation.
2. **Should "no relevant files changed" jobs be required checks at all?** If `simulation-service` is marked a required check but a PR only touches `frontend/`, GitHub will show it as skipped, which satisfies "required" — but this should be explicitly tested during rollout step 4, not assumed.
3. **Should `npm run lint` failures block the pipeline**, or only test failures? Requirements only mentioned tests explicitly; this plan includes lint (matches each service's own `CLAUDE.md` workflow guidance) — confirm that's wanted in CI too, not just as local/pre-commit guidance.
4. **Concurrency control:** should in-flight runs for a PR be cancelled when a new commit is pushed (`concurrency: group: ${{ github.workflow }}-${{ github.ref }}, cancel-in-progress: true`)? Recommended to save CI minutes but not in the original requirements — confirm.

## Decisions already confirmed

- Trigger gates the merge via `pull_request` (not post-merge `push`).
- Node.js pinned to version 22 (LTS) across `frontend` and `backend` jobs — no prior pin existed in the repo.
- Branch protection configuration is in scope for this plan.
- Backend `test:e2e` suite is deferred to a future iteration, not part of this pipeline.
