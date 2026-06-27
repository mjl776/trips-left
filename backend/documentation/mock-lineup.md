# Mock Lineup Simulator — API

## Overview

This document is API documentation for the backend endpoints for a Mock Lineup Simulator

Lets a user build a fantasy lineup — either freely as a **mock** lineup or by **importing** an existing lineup/league from Sleeper — and freely add/remove/swap players to see how it affects projected points. The goal is to surface actionable insight: which players to start, which to bench, and which are worth a flier (dark horse).

Every lineup is tied to a league setting (scoring rules + roster slots), which can come from either source:
- **Imported** — pulled from a real Sleeper league via its scoring settings and roster.
- **Mock** — user-defined scoring rules and roster slots, no real league behind it.

Either way, the lineup ends up referencing one set of scoring rules, which is what makes projected points possible in the first place — fantasy points don't exist without scoring weights to apply to a stat line.

## Endpoints

### League setup

A lineup can't exist without a league setting attached, so one of these has to happen first.

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/create-mock-league` | User defines their own scoring settings + roster slots, no real league behind it. |
| `POST` | `/import-sleeper-league` | Given a Sleeper league ID, pulls its real scoring settings + roster positions. |
| `GET` | `/view-sleeper-league/:leagueId` | View the scoring settings + roster slots currently attached to a lineup. |
| `PATCH` | `/update-mock-league-settings/:leagueId` | Edit scoring settings on a **mock** league only. Real imported leagues stay read-only/synced from Sleeper — editing them would desync from the source league. |

### Lineup management

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/create-lineup` | Create a new lineup referencing a league setting (mock or imported). Required before `/add-player` has anywhere to add to. |
| `POST` | `/add-player` | Add a player to the mock lineup. |
| `POST` | `/add-drop-player` | Add a player and drop a player to the mock lineup. |
| `DELETE` | `/remove-player` | Drop a player from the lineup. |
| `PATCH` | `/swap-players` | Move a player between roster slots — bench ↔ starter, or starter ↔ starter. |
| `GET` | `/view-lineup` | Full lineup view — every player currently rostered, starters and bench. |

### Player stats & insights

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/calculate-projected-points` | Computes projected fantasy points for every player in a lineup, using the lineup's league scoring settings. |
| `GET` | `/view-player` | Player overview: season stats, projected points, recent performance history, AI insights (TBD, scoped to lift required). |

`/calculate-projected-points` is the single source of truth the rest of the insight layer builds on — **best player**, **worst player** (drop candidate), and **dark horse** (sleeper pick) are all derived from this one ranked output rather than separate calculations, since they're different lenses on the same underlying per-player projection rather than independent computations.

## Notes

- Projected points are always relative to a specific league's scoring settings — there's no global/default projection, since the same stat line scores differently across leagues.
- A lineup cannot be created or modified until it has a league setting (mock or imported) attached.
