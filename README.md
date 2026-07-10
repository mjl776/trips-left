## Overview

This application is a fantasy football optimizer that uses advanced metrics the average fan might not look at to help you identify the key players in your lineup.

## Features

- **Create your own lineup** — creates a mock fantasy lineup with default settings.
- **View your own lineup** — view your lineup, including which players are considered dark horses, best players, and worst players.

## System Design

```
┌─────────────────────────────┐
│          Frontend           │
│    Next.js 16 + React 19    │
│       localhost:3000        │
└──────────────┬──────────────┘
               │  REST / JSON over fetch
               ▼
┌─────────────────────────────┐
│           Backend           │
│      NestJS (Node.js)       │
│       localhost:8080        │
└──────────────┬──────────────┘
               │  SQL via Prisma ORM
               ▼
┌─────────────────────────────┐
│           Database          │
│    PostgreSQL (Supabase)    │
└─────────────────────────────┘
```

## Inspiration Behind the App

For me, I have never formally won a fantasy football league but have always wanted to find a way to gain a unique edge on my competitors. I came up with the app idea of Trips Left that would help inspire to discover how I can identify the weakspots on my team and also acquire players who excel in advanced metrics.

## What does Trips Left Mean?

Trips Left specifically is a football formation for alignment. It means three receivers lined up on the left side of the offensive formation (the strong side is to the left), with one receiver on the right. "Trips" refers to the three-receiver bunch — the trio.

The idea behind the name of the app is it is intended to help figure out your fantasy teams objectives and how you can find the right team to align with your goals for the fantasy season.