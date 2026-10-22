-- AlterTable
ALTER TABLE "UserProfile" ADD COLUMN     "avatarUrl" TEXT,
ADD COLUMN     "coverUrl" TEXT,
ADD COLUMN     "dailyGoalMinutes" INTEGER NOT NULL DEFAULT 15;
