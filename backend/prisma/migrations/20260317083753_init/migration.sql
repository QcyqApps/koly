-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "name" TEXT,
    "business_name" TEXT,
    "industry" TEXT,
    "city" TEXT,
    "tax_form" TEXT NOT NULL DEFAULT 'ryczalt',
    "tax_rate" DECIMAL(5,2) NOT NULL DEFAULT 8.5,
    "zus_monthly" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "subscription_status" TEXT NOT NULL DEFAULT 'trial',
    "trial_ends_at" TIMESTAMP(3) NOT NULL DEFAULT NOW() + INTERVAL '14 days',
    "onboarding_completed" BOOLEAN NOT NULL DEFAULT false,
    "refresh_token" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fixed_costs" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fixed_costs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "services" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "price" DECIMAL(10,2) NOT NULL,
    "duration_minutes" INTEGER NOT NULL,
    "material_cost" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "services_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "visits" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "service_id" TEXT NOT NULL,
    "visit_date" DATE NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'completed',
    "actual_price" DECIMAL(10,2),
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "visits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "daily_snapshots" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "snapshot_date" DATE NOT NULL,
    "revenue" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "material_costs" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "fixed_costs_daily" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "estimated_tax" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "net_profit" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "visit_count" INTEGER NOT NULL DEFAULT 0,
    "no_show_count" INTEGER NOT NULL DEFAULT 0,
    "no_show_cost" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "services_ranking" JSONB,
    "ai_suggestions" JSONB,
    "ai_summary" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "daily_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chat_messages" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chat_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_reports" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "report_type" TEXT NOT NULL DEFAULT 'weekly',
    "period_start" DATE NOT NULL,
    "period_end" DATE NOT NULL,
    "content" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_reports_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "fixed_costs_user_id_idx" ON "fixed_costs"("user_id");

-- CreateIndex
CREATE INDEX "services_user_id_idx" ON "services"("user_id");

-- CreateIndex
CREATE INDEX "visits_user_id_visit_date_idx" ON "visits"("user_id", "visit_date");

-- CreateIndex
CREATE INDEX "visits_user_id_status_idx" ON "visits"("user_id", "status");

-- CreateIndex
CREATE INDEX "daily_snapshots_user_id_snapshot_date_idx" ON "daily_snapshots"("user_id", "snapshot_date" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "daily_snapshots_user_id_snapshot_date_key" ON "daily_snapshots"("user_id", "snapshot_date");

-- CreateIndex
CREATE INDEX "chat_messages_user_id_session_id_created_at_idx" ON "chat_messages"("user_id", "session_id", "created_at");

-- CreateIndex
CREATE INDEX "ai_reports_user_id_period_start_idx" ON "ai_reports"("user_id", "period_start");

-- AddForeignKey
ALTER TABLE "fixed_costs" ADD CONSTRAINT "fixed_costs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "services" ADD CONSTRAINT "services_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "visits" ADD CONSTRAINT "visits_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "visits" ADD CONSTRAINT "visits_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "services"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "daily_snapshots" ADD CONSTRAINT "daily_snapshots_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_reports" ADD CONSTRAINT "ai_reports_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
