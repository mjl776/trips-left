/**
 * calculateHistoricalPoints.ts
 *
 * Re-scores real, already-played weeks from `player_stats` under a chosen
 * scoring setting. Nothing is estimated here — unlike calculate_projections.py,
 * which guesses an unplayed week's stat line, this applies scoring math
 * directly to stat lines that already happened. Useful for backtesting the
 * rolling-average projection model, or seeing how a custom scoring setting
 * would have scored last season.
 *
 * Usage:
 *   npx tsx scripts/calculateHistoricalPoints.ts --season 2024
 *   npx tsx scripts/calculateHistoricalPoints.ts --season 2024 --week 6
 *   npx tsx scripts/calculateHistoricalPoints.ts --season 2024 --leagueId <id>
 *   npx tsx scripts/calculateHistoricalPoints.ts --season 2024 --player <playerId>
 *
 * Always writes the full result set to data/historical-points-<season>.json.
 * Without --player, the console only shows each week's top 5 (the full
 * breakdown is in the JSON file); with --player, prints that player's full
 * week-by-week line.
 */

import 'dotenv/config';
import { writeFileSync, mkdirSync } from 'fs';
import { dirname } from 'path';
import { PrismaClient, Prisma } from '../generated/prisma/client';
import {
  DEFAULT_SCORING_SETTINGS,
  ScoringSettings,
} from '../src/league/league.models';
import { calculateFantasyPoints, StatLine } from '../src/projections/scoring';

const prisma = new PrismaClient();

// nflverse's player_stats includes the real NFL postseason (weeks 19-22:
// wildcard/divisional/conference/Super Bowl), which fantasy leagues don't
// score. Excluded by default — pass --include-postseason to opt in.
const REGULAR_SEASON_WEEKS = 18;

type HistoricalPoint = {
  week: number;
  playerId: string;
  fullName: string;
  position: string;
  points: number;
};

function getArg(flag: string): string | undefined {
  const index = process.argv.indexOf(flag);
  return index === -1 ? undefined : process.argv[index + 1];
}

function toNum(value: Prisma.Decimal | null | undefined): number | null {
  return value == null ? null : value.toNumber();
}

function toStatLine(stat: {
  passYd: Prisma.Decimal | null;
  passTd: Prisma.Decimal | null;
  rushYd: Prisma.Decimal | null;
  rushTd: Prisma.Decimal | null;
  rec: Prisma.Decimal | null;
  recYd: Prisma.Decimal | null;
  recTd: Prisma.Decimal | null;
}): StatLine {
  return {
    passYd: toNum(stat.passYd),
    passTd: toNum(stat.passTd),
    rushYd: toNum(stat.rushYd),
    rushTd: toNum(stat.rushTd),
    rec: toNum(stat.rec),
    recYd: toNum(stat.recYd),
    recTd: toNum(stat.recTd),
  };
}

async function getScoringSettings(leagueId?: string): Promise<ScoringSettings> {
  if (!leagueId) {
    return DEFAULT_SCORING_SETTINGS;
  }
  const league = await prisma.league.findUnique({ where: { leagueId } });
  if (!league) {
    throw new Error(`League ${leagueId} not found`);
  }
  return league.scoringSettings as unknown as ScoringSettings;
}

async function main() {
  const season = Number(getArg('--season'));
  if (!season) {
    console.error(
      'Usage: --season <year> [--week <n>] [--leagueId <id>] [--player <playerId>]',
    );
    process.exit(1);
  }
  const weekArg = getArg('--week');
  const week = weekArg ? Number(weekArg) : undefined;
  const leagueId = getArg('--leagueId');
  const playerId = getArg('--player');
  const includePostseason = process.argv.includes('--include-postseason');

  if (week && week > REGULAR_SEASON_WEEKS && !includePostseason) {
    console.error(
      `--week ${week} is in the NFL postseason (weeks > ${REGULAR_SEASON_WEEKS}); fantasy leagues don't score these. Pass --include-postseason to override.`,
    );
    process.exit(1);
  }

  const scoringSettings = await getScoringSettings(leagueId);
  console.log(
    leagueId
      ? `Using scoring settings from league ${leagueId}`
      : 'Using DEFAULT_SCORING_SETTINGS (Sleeper default)',
  );

  const stats = await prisma.playerStats.findMany({
    where: { season, week, playerId },
    include: { player: true },
  });

  const results: HistoricalPoint[] = stats.map((stat) => ({
    week: stat.week,
    playerId: stat.playerId,
    fullName: stat.player.fullName,
    position: stat.player.position,
    points: calculateFantasyPoints(toStatLine(stat), scoringSettings),
  }));

  results.sort((a, b) => a.week - b.week || b.points - a.points);

  const outPath = `data/historical-points-${season}.json`;
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, JSON.stringify(results, null, 2));
  console.log(`Wrote ${results.length} rows to ${outPath}`);

  if (playerId) {
    for (const r of results) {
      console.log(`Week ${r.week}: ${r.points.toFixed(2)} pts — ${r.fullName} (${r.playerId})`);
    }
  } else {
    const weeks = [...new Set(results.map((r) => r.week))].sort((a, b) => a - b);
    for (const w of weeks) {
      const top = results.filter((r) => r.week === w).slice(0, 5);
      console.log(`\nWeek ${w} — top 5:`);
      for (const r of top) {
        console.log(`  ${r.points.toFixed(2)} pts — ${r.fullName} (${r.playerId})`);
      }
    }
  }
}

main()
  .catch((e) => {
    console.error('Failed:', e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
