"""
pull_stats.py

Pulls realized weekly NFL player stats from nflverse (via nflreadpy) and upserts
them into the `player_stats` Postgres table, keyed to join with the Sleeper-keyed
`players` table via the nflverse -> Sleeper ID crosswalk.

This is a standalone ingest job. It talks to Postgres directly and shares nothing
with the Next.js app except the database. Run it manually or on a schedule
(e.g. a weekly GitHub Action during the season).

Usage:
    python pull_stats.py --seasons 2024 2025
    python pull_stats.py --seasons 2025 --week 5     # single week refresh
    python pull_stats.py --seasons 2025 --dry-run    # don't write, just report

Env:
    DATABASE_URL  Postgres connection string (the direct/session connection,
                  NOT the pgbouncer pooled one — bulk upserts need real sessions).
"""

import argparse
import os
import sys

import nflreadpy as nfl
import polars as pl
from sqlalchemy import create_engine, text


# ---------------------------------------------------------------------------
# Column mapping: nflverse load_player_stats column  ->  our player_stats column
#
# Mapped to match the PlayerStats Prisma model exactly. Left side = the column
# name nflverse returns (verify with --inspect); right side = our DB column
# (the @map() name in schema.prisma). Only these columns are written.
#
# To add more stat lines later: add the column to the Prisma model + migrate,
# then add the mapping pair here. Keep this dict in sync with PlayerStats.
# ---------------------------------------------------------------------------
STAT_COLUMNS = {
    # passing
    "passing_yards": "pass_yd",
    "passing_tds": "pass_td",
    # rushing
    "rushing_yards": "rush_yd",
    "rushing_tds": "rush_td",
    # receiving
    "receptions": "rec",
    "receiving_yards": "rec_yd",
    "receiving_tds": "rec_td",
}

# Mirrors scripts/syncPlayers.ts FANTASY_POSITIONS — the `players` table only
# carries these positions, so IDP/OL/special-teams stat rows have no FK target.
FANTASY_POSITIONS = {"QB", "RB", "WR", "TE", "K", "DEF"}


def get_engine():
    url = os.environ.get("DATABASE_URL")
    if not url:
        sys.exit("DATABASE_URL not set. Export the direct Postgres connection string.")
    # SQLAlchemy wants the postgresql+psycopg2 scheme; normalize if needed.
    if url.startswith("postgresql://"):
        url = url.replace("postgresql://", "postgresql+psycopg2://", 1)
    return create_engine(url)


def load_id_crosswalk() -> pl.DataFrame:
    """
    nflverse maintains an ID map across platforms. We need nflverse gsis_id
    (the key in player stats) -> sleeper_id (our Player PK).
    """
    ids = nfl.load_ff_playerids()
    # Keep only the two columns we need; names per nflverse ff_playerids dict.
    # 'gsis_id' is the play-by-play / player_stats key; 'sleeper_id' is Sleeper's.
    needed = [c for c in ["gsis_id", "sleeper_id"] if c in ids.columns]
    if "gsis_id" not in needed or "sleeper_id" not in needed:
        sys.exit(
            f"Crosswalk missing expected columns. Got: {ids.columns}. "
            "Run with --inspect to see available ID columns."
        )
    return ids.select(["gsis_id", "sleeper_id"]).drop_nulls()


def build_rows(seasons, week=None, inspect=False):
    print(f"Loading player stats for seasons {seasons}...")
    stats = nfl.load_player_stats(seasons=seasons)

    if inspect:
        print("\n=== nflverse load_player_stats columns ===")
        for c in stats.columns:
            print(" ", c)
        print("\n=== sample row ===")
        print(stats.head(1).to_dicts())
        sys.exit(0)

    if "position" in stats.columns:
        before = stats.height
        stats = stats.filter(pl.col("position").is_in(FANTASY_POSITIONS))
        dropped = before - stats.height
        if dropped > 0:
            print(f"Filtered out {dropped} non-fantasy-position rows (IDP/OL/ST).")

    if week is not None:
        stats = stats.filter(pl.col("week") == week)

    # The player key in player_stats is gsis player id. Column name has been
    # 'player_id' in recent nflverse outputs (a gsis id like '00-0019596').
    id_col = "player_id" if "player_id" in stats.columns else "gsis_id"

    # Map nflverse stat columns -> our columns; keep only ones present.
    present = {src: dst for src, dst in STAT_COLUMNS.items() if src in stats.columns}
    select_cols = [id_col, "season", "week"] + list(present.keys())
    stats = stats.select([c for c in select_cols if c in stats.columns])
    stats = stats.rename({id_col: "gsis_id", **present})

    # Join to crosswalk to attach sleeper_id (our Player PK / FK).
    crosswalk = load_id_crosswalk()
    joined = stats.join(crosswalk, on="gsis_id", how="inner")

    dropped = stats.height - joined.height
    if dropped > 0:
        print(f"Note: {dropped} stat rows had no Sleeper ID mapping and were skipped.")

    # Final shape: sleeper player_id + season + week + stat columns.
    joined = joined.rename({"sleeper_id": "player_id"}).drop("gsis_id")
    joined = joined.with_columns(pl.col("player_id").cast(pl.Utf8))
    return joined


def upsert_rows(engine, df: pl.DataFrame, dry_run=False):
    if df.height == 0:
        print("No rows to write.")
        return

    # Defensive: the crosswalk can reference players our local `players` table
    # doesn't carry (IDPs excluded by design, or sync gaps like FB-tagged
    # skill players). Filter those out here instead of failing the FK on insert.
    with engine.connect() as conn:
        existing_ids = {row[0] for row in conn.execute(text("SELECT player_id FROM players"))}
    before = df.height
    df = df.filter(pl.col("player_id").is_in(existing_ids))
    skipped = before - df.height
    if skipped > 0:
        print(f"Skipped {skipped} stat rows whose player_id isn't in the local players table.")
    if df.height == 0:
        print("No rows to write after filtering against players table.")
        return

    rows = df.to_dicts()
    stat_cols = [c for c in df.columns if c not in ("player_id", "season", "week")]

    if dry_run:
        print(f"[dry-run] would upsert {len(rows)} rows into player_stats.")
        print("[dry-run] sample:", rows[0])
        return

    # Build an INSERT ... ON CONFLICT upsert. Far faster than row-by-row for
    # the volume here, and Postgres handles the idempotency on the natural key.
    col_list = ["player_id", "season", "week"] + stat_cols
    placeholders = ", ".join(f":{c}" for c in col_list)
    update_set = ", ".join(f"{c} = EXCLUDED.{c}" for c in stat_cols)

    sql = text(
        f"""
        INSERT INTO player_stats ({", ".join(col_list)})
        VALUES ({placeholders})
        ON CONFLICT (player_id, season, week)
        DO UPDATE SET {update_set}
        """
    )

    BATCH = 1000
    written = 0
    with engine.begin() as conn:
        for i in range(0, len(rows), BATCH):
            chunk = rows[i : i + BATCH]
            conn.execute(sql, chunk)
            written += len(chunk)
            print(f"  upserted {written}/{len(rows)}")
    print(f"Done. Upserted {written} rows into player_stats.")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--seasons", type=int, nargs="+", required=True,
                    help="Season(s) to pull, e.g. --seasons 2024 2025")
    ap.add_argument("--week", type=int, default=None,
                    help="Optional single week to refresh")
    ap.add_argument("--dry-run", action="store_true",
                    help="Report what would be written without writing")
    ap.add_argument("--inspect", action="store_true",
                    help="Print nflverse columns + a sample row, then exit")
    args = ap.parse_args()

    df = build_rows(args.seasons, week=args.week, inspect=args.inspect)
    print(f"Prepared {df.height} mapped stat rows.")

    if not args.inspect:
        engine = get_engine()
        upsert_rows(engine, df, dry_run=args.dry_run)


if __name__ == "__main__":
    main()