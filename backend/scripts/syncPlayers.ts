/**
 * syncPlayers.ts
 *
 * Fetches the full NFL player dump from Sleeper and upserts it into the
 * `players` table. Sleeper's /players/nfl endpoint returns ALL players
 * (~10k+) in a single ~5MB response and should be called at most once per
 * day — so this makes exactly ONE Sleeper API call regardless of how many
 * rows it writes.
 *
 * Usage:
 *   npx tsx scripts/syncPlayers.ts
 *   npx tsx scripts/syncPlayers.ts --from-cache   (read local JSON, 0 API calls)
 *   npx tsx scripts/syncPlayers.ts --all          (don't filter by position)
 */

import "dotenv/config";
import { PrismaClient } from "../generated/prisma/client";
import { writeFileSync, readFileSync, existsSync, mkdirSync } from "fs";
import { dirname } from "path";
import _ from "lodash";

const prisma = new PrismaClient();

const SLEEPER_URL = "https://api.sleeper.app/v1/players/nfl";
const CACHE_PATH = "data/players-nfl.json";
const CHUNK_SIZE = 500;

// Fantasy-relevant positions. Pass --all to skip this filter.
const FANTASY_POSITIONS = new Set(["QB", "RB", "WR", "TE", "K", "DEF"]);

type SleeperPlayer = {
  player_id: string;
  full_name?: string;
  first_name?: string;
  last_name?: string;
  position?: string;
  team?: string | null;
  status?: string | null;
  bye_week?: number | null;
};

/** Fetch the dump from Sleeper (1 API call) and cache it to disk. */
async function fetchFromSleeper(): Promise<Record<string, SleeperPlayer>> {
  console.log(`Fetching player dump from Sleeper: ${SLEEPER_URL}`);
  const res = await fetch(SLEEPER_URL);
  if (!res.ok) {
    throw new Error(`Sleeper returned ${res.status} ${res.statusText}`);
  }
  const data = (await res.json()) as Record<string, SleeperPlayer>;

  // Cache to disk so re-imports / schema iteration cost 0 API calls.
  mkdirSync(dirname(CACHE_PATH), { recursive: true });
  writeFileSync(CACHE_PATH, JSON.stringify(data));
  console.log(`Cached dump to ${CACHE_PATH}`);

  return data;
}

function readFromCache(): Record<string, SleeperPlayer> {
  if (!existsSync(CACHE_PATH)) {
    throw new Error(
      `No cache at ${CACHE_PATH}. Run without --from-cache first to fetch it.`
    );
  }
  console.log(`Reading cached dump from ${CACHE_PATH}`);
  return JSON.parse(readFileSync(CACHE_PATH, "utf-8"));
}

function toPlayerRow(p: SleeperPlayer) {
  const fullName =
    p.full_name ??
    `${p.first_name ?? ""} ${p.last_name ?? ""}`.trim() ??
    p.player_id;

  return {
    playerId: p.player_id,
    fullName: fullName || p.player_id, // never empty
    position: p.position ?? "UNK",
    team: p.team ?? null,
    status: p.status ?? null,
    byeWeek: p.bye_week ?? null,
  };
}

async function syncPlayers() {
  const useCache = process.argv.includes("--from-cache");
  const includeAll = process.argv.includes("--all");

  const dump = useCache ? readFromCache() : await fetchFromSleeper();

  let players = Object.values(dump);
  console.log(`Dump contains ${players.length} total players`);

  if (!includeAll) {
    players = players.filter((p) => p.position && FANTASY_POSITIONS.has(p.position));
    console.log(`Filtered to ${players.length} fantasy-relevant players`);
  }

  // Skip any malformed entries with no player_id.
  players = players.filter((p) => !!p.player_id);

  const rows = players.map(toPlayerRow);
  const chunks = _.chunk(rows, CHUNK_SIZE);
  console.log(`Upserting in ${chunks.length} chunks of up to ${CHUNK_SIZE}...`);

  let done = 0;
  let failed = 0;
  for (const [i, chunk] of chunks.entries()) {
    const results = await Promise.allSettled(
      chunk.map((row) =>
        prisma.player.upsert({
          where: { playerId: row.playerId },
          create: row,
          // Only rewrite volatile fields; player_id/position are stable.
          update: {
            fullName: row.fullName,
            team: row.team,
            status: row.status,
            byeWeek: row.byeWeek,
          },
        })
      )
    );

    results.forEach((result, j) => {
      if (result.status === "rejected") {
        failed++;
        console.error(`  failed upsert for player ${chunk[j].playerId}:`, result.reason);
      }
    });

    done += chunk.length;
    console.log(`  chunk ${i + 1}/${chunks.length} — ${done}/${rows.length} rows`);
  }
  if (failed > 0) {
    console.warn(`${failed} player upserts failed — see logs above.`);
  }

  const total = await prisma.player.count();
  console.log(`Done. players table now has ${total} rows.`);
}

syncPlayers()
  .catch((e) => {
    console.error("Sync failed:", e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });