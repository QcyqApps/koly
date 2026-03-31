-- AlterTable
ALTER TABLE "users" ADD COLUMN     "monthly_goal" DECIMAL(10,2),
ALTER COLUMN "trial_ends_at" SET DEFAULT NOW() + INTERVAL '14 days';
