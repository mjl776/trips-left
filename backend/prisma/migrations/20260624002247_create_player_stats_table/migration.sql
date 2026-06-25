-- CreateTable
CREATE TABLE "player_stats" (
    "player_id" TEXT NOT NULL,
    "season" SMALLINT NOT NULL,
    "week" SMALLINT NOT NULL,
    "pass_yd" DECIMAL(6,2),
    "pass_td" DECIMAL(5,2),
    "rush_yd" DECIMAL(6,2),
    "rush_td" DECIMAL(5,2),
    "rec" DECIMAL(5,2),
    "rec_yd" DECIMAL(6,2),
    "rec_td" DECIMAL(5,2),

    CONSTRAINT "player_stats_pkey" PRIMARY KEY ("player_id","season","week")
);

-- CreateIndex
CREATE INDEX "player_stats_season_week_idx" ON "player_stats"("season", "week");

-- AddForeignKey
ALTER TABLE "player_stats" ADD CONSTRAINT "player_stats_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "players"("player_id") ON DELETE RESTRICT ON UPDATE CASCADE;
