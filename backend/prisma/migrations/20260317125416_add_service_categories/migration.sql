-- AlterTable
ALTER TABLE "services" ADD COLUMN     "category_id" TEXT;

-- AlterTable
ALTER TABLE "users" ALTER COLUMN "trial_ends_at" SET DEFAULT NOW() + INTERVAL '14 days';

-- CreateTable
CREATE TABLE "service_categories" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "service_categories_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "service_categories_user_id_idx" ON "service_categories"("user_id");

-- CreateIndex
CREATE INDEX "services_category_id_idx" ON "services"("category_id");

-- AddForeignKey
ALTER TABLE "service_categories" ADD CONSTRAINT "service_categories_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "services" ADD CONSTRAINT "services_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "service_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;
