-- AlterTable
ALTER TABLE "users" ADD COLUMN     "is_demo" BOOLEAN NOT NULL DEFAULT false,
ALTER COLUMN "trial_ends_at" SET DEFAULT NOW() + INTERVAL '14 days';
