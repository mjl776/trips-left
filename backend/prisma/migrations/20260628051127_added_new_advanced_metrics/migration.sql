-- AlterTable
ALTER TABLE "player_stats" ADD COLUMN     "passing_epa" DECIMAL(5,2),
ADD COLUMN     "racr" DECIMAL(5,2),
ADD COLUMN     "receiving_epa" DECIMAL(5,2),
ADD COLUMN     "receiving_yards_after_catch" DECIMAL(5,2),
ADD COLUMN     "rushing_epa" DECIMAL(5,2);
