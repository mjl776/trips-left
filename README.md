## Overview

This application is a fantasy football optimizer that uses advanced metrics the average fan might not look at to help you identify the key players in your lineup.

## Features

- **Create your own lineup** — start from a mock league with a default roster, or import a real Sleeper league, then fill starter slots from the full player pool with server-validated slot eligibility.
- **Manage your lineup** — view starters and bench, and add, remove, or swap players with live roster updates.
- **Lineup insights** — surfaces your roster's best and worst scorers, plus a "dark horse" pick: a rostered player whose season EPA clears the top-20% threshold for their position, shown with percentile and position rank.
- **Trade simulator** — compare two players for value, efficiency, and ROI, backed by a Monte Carlo bootstrap simulation that resamples 10,000 iterations of real weekly scoring history to estimate expected point delta, win probability, and a p10/p50/p90 outcome range.

## System Design

```
┌─────────────────────────────┐
│          Frontend           │
│    Next.js 16 + React 19    │
│   www.tripsleft.com (Vercel)│
└──────────────┬──────────────┘
               │  REST / JSON over fetch
               ▼
┌─────────────────────────────┐
│           Backend           │
│      NestJS (Node.js)       │
│ trips-left-production.up.   │
│    railway.app (Railway)    │
└──────────┬───────────┬──────┘
           │           │  REST / JSON (SIMULATION_SERVICE_URL)
           │           ▼
           │  ┌─────────────────────────────┐
           │  │      Simulation Service      │
           │  │      FastAPI (Python)        │
           │  │  stateless Monte Carlo trade │
           │  │   simulator (Railway)        │
           │  └─────────────────────────────┘
           │  SQL via Prisma ORM
           ▼
┌─────────────────────────────┐
│           Database          │
│    PostgreSQL (Supabase)    │
└─────────────────────────────┘
```

The simulation service is stateless, has no database access or credentials, and is only reachable from the backend (`backend/src/trade`) — never directly from the frontend. It powers the trade simulator by running a bootstrap-resampling Monte Carlo simulation over two players' weekly fantasy-point histories. See [`simulation-service/README.md`](./simulation-service/README.md) for details.

## Deployment

- **Frontend** — hosted on [Vercel](https://vercel.com): [https://www.tripsleft.com](https://www.tripsleft.com)
- **Backend** — hosted on [Railway](https://railway.app): [https://trips-left-production.up.railway.app](https://trips-left-production.up.railway.app)
- **Simulation Service** — hosted on [Railway](https://railway.app), deployed via Dockerfile; reached by the backend through the `SIMULATION_SERVICE_URL` env var

## Inspiration Behind the App

For me, I have never formally won a fantasy football league but have always wanted to find a way to gain a unique edge on my competitors. I came up with the app idea of Trips Left that would help inspire to discover how I can identify the weakspots on my team and also acquire players who excel in advanced metrics.

## What does Trips Left Mean?

Trips Left specifically is a football formation for alignment. It means three receivers lined up on the left side of the offensive formation (the strong side is to the left), with one receiver on the right. "Trips" refers to the three-receiver bunch — the trio.

The idea behind the name of the app is it is intended to help figure out your fantasy teams objectives and how you can find the right team to align with your goals for the fantasy season.