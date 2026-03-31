-- AlterTable
ALTER TABLE "users" ALTER COLUMN "trial_ends_at" SET DEFAULT NOW() + INTERVAL '14 days';

-- CreateTable
CREATE TABLE "gallery_images" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "visit_id" TEXT,
    "filename" TEXT NOT NULL,
    "original_name" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "file_size" INTEGER NOT NULL,
    "thumbnail_path" TEXT,
    "description" TEXT,
    "is_portfolio" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "gallery_images_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "generated_captions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "image_id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "platform" TEXT NOT NULL DEFAULT 'instagram',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "generated_captions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "gallery_images_user_id_created_at_idx" ON "gallery_images"("user_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "gallery_images_visit_id_idx" ON "gallery_images"("visit_id");

-- CreateIndex
CREATE INDEX "generated_captions_image_id_idx" ON "generated_captions"("image_id");

-- AddForeignKey
ALTER TABLE "gallery_images" ADD CONSTRAINT "gallery_images_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gallery_images" ADD CONSTRAINT "gallery_images_visit_id_fkey" FOREIGN KEY ("visit_id") REFERENCES "visits"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "generated_captions" ADD CONSTRAINT "generated_captions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "generated_captions" ADD CONSTRAINT "generated_captions_image_id_fkey" FOREIGN KEY ("image_id") REFERENCES "gallery_images"("id") ON DELETE CASCADE ON UPDATE CASCADE;
