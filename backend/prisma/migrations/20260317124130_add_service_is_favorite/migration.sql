-- AlterTable
ALTER TABLE "services" ADD COLUMN     "is_favorite" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "users" ALTER COLUMN "trial_ends_at" SET DEFAULT NOW() + INTERVAL '14 days';
