-- AlterTable
ALTER TABLE "player_stats" ADD COLUMN     "fg_made_0_19" DECIMAL(5,2),
ADD COLUMN     "fg_made_20_29" DECIMAL(5,2),
ADD COLUMN     "fg_made_30_39" DECIMAL(5,2),
ADD COLUMN     "fg_made_40_49" DECIMAL(5,2),
ADD COLUMN     "fg_made_50_59" DECIMAL(5,2),
ADD COLUMN     "fg_made_60p" DECIMAL(5,2),
ADD COLUMN     "fg_miss" DECIMAL(5,2),
ADD COLUMN     "xp_made" DECIMAL(5,2),
ADD COLUMN     "xp_miss" DECIMAL(5,2);
