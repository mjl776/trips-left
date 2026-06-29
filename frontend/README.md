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

