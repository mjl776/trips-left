-- CreateTable
CREATE TABLE "players" (
    "player_id" TEXT NOT NULL,
    "full_name" TEXT NOT NULL,
    "position" TEXT NOT NULL,
    "team" TEXT,
    "status" TEXT,
    "bye_week" SMALLINT,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "players_pkey" PRIMARY KEY ("player_id")
);

-- CreateTable
CREATE TABLE "leagues" (
    "league_id" TEXT NOT NULL,
    "name" TEXT,
    "season" SMALLINT NOT NULL,
    "scoring_settings" JSONB NOT NULL,
    "roster_positions" TEXT[],
    "num_teams" SMALLINT,

    CONSTRAINT "leagues_pkey" PRIMARY KEY ("league_id")
);

-- CreateTable
CREATE TABLE "rosters" (
    "roster_id" TEXT NOT NULL,
    "league_id" TEXT NOT NULL,
    "owner_id" TEXT,

    CONSTRAINT "rosters_pkey" PRIMARY KEY ("roster_id","league_id")
);

-- CreateTable
CREATE TABLE "roster_players" (
    "roster_id" TEXT NOT NULL,
    "league_id" TEXT NOT NULL,
    "player_id" TEXT NOT NULL,
    "slot" TEXT,

    CONSTRAINT "roster_players_pkey" PRIMARY KEY ("roster_id","league_id","player_id")
);

-- CreateTable
CREATE TABLE "projections" (
    "player_id" TEXT NOT NULL,
    "season" SMALLINT NOT NULL,
    "week" SMALLINT NOT NULL,
    "source" TEXT NOT NULL,
    "proj_points" DECIMAL(6,2),
    "floor" DECIMAL(6,2),
    "ceiling" DECIMAL(6,2),
    "std_dev" DECIMAL(6,2),

    CONSTRAINT "projections_pkey" PRIMARY KEY ("player_id","season","week","source")
);

-- CreateIndex
CREATE INDEX "players_position_idx" ON "players"("position");

-- CreateIndex
CREATE INDEX "players_team_idx" ON "players"("team");

-- CreateIndex
CREATE INDEX "projections_season_week_idx" ON "projections"("season", "week");

-- AddForeignKey
ALTER TABLE "rosters" ADD CONSTRAINT "rosters_league_id_fkey" FOREIGN KEY ("league_id") REFERENCES "leagues"("league_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "roster_players" ADD CONSTRAINT "roster_players_roster_id_league_id_fkey" FOREIGN KEY ("roster_id", "league_id") REFERENCES "rosters"("roster_id", "league_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "roster_players" ADD CONSTRAINT "roster_players_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "players"("player_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projections" ADD CONSTRAINT "projections_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "players"("player_id") ON DELETE RESTRICT ON UPDATE CASCADE;
