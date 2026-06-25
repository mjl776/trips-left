-- AlterTable
ALTER TABLE "player_stats" ADD COLUMN     "attempts" DECIMAL(5,2),
ADD COLUMN     "carries" DECIMAL(5,2),
ADD COLUMN     "passing_air_yards" DECIMAL(6,2),
ADD COLUMN     "receiving_air_yards" DECIMAL(6,2),
ADD COLUMN     "target_share" DECIMAL(5,4),
ADD COLUMN     "targets" DECIMAL(5,2),
ADD COLUMN     "wopr" DECIMAL(5,4);
