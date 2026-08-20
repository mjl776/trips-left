## Overview

This is the frontend for the fantasy football optimizer, built with [Next.js](https://nextjs.org) (App Router) and React. It's a thin client — all lineup/player/scoring logic lives in the NestJS backend; this app just renders it and talks to the backend over HTTP via `NEXT_PUBLIC_API_URL`.

## Running locally

1. Install dependencies:
   ```bash
   npm install
   ```
2. In `.env.local`, point at your running backend (defaults to port `8080`):
   ```
   NEXT_PUBLIC_API_URL=http://localhost:8080
   ```
3. Start the dev server:
   ```bash
   npm run dev
   ```
4. Open [http://localhost:3000](http://localhost:3000) in your browser.

## CI/CD

Every pull request targeting `main` runs [`.github/workflows/ci.yml`](../.github/workflows/ci.yml) on GitHub Actions. The `frontend` job only runs when a PR touches files under this directory — a shared `changes` job path-filters the three service jobs, so a PR that only changes `backend/` or `simulation-service/` skips this one entirely (shows as "skipped," not "failed").

The job:
1. Sets up Node 22 with npm dependency caching (keyed on `package-lock.json`).
2. `npm ci`
3. `npm run lint`
4. `npm run test:run` — the same Vitest command used locally, covering both unit tests (`lib/tests/`) and component tests (colocated `components/*/index.test.tsx`) in one run.

No secrets are required for this job. See [documentation/ci-cd-pipeline-plan.md](../documentation/ci-cd-pipeline-plan.md) for the full pipeline design and rollout notes.

