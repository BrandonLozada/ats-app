-- CreateEnum
CREATE TYPE "pipeline_version_status" AS ENUM ('DRAFT', 'PUBLISHED');

-- CreateEnum
CREATE TYPE "stage_categories" AS ENUM ('APPLIED', 'SCREENING', 'CONTACT', 'INTERVIEW', 'ASSESSMENT', 'DOCUMENTATION', 'OFFER', 'OTHER');

-- DropForeignKey
ALTER TABLE "pipeline_stages" DROP CONSTRAINT "pipeline_stages_pipeline_id_fkey";

-- DropIndex
DROP INDEX "pipeline_stages_pipeline_id_idx";

-- DropIndex
DROP INDEX "pipeline_stages_pipeline_id_order_key";

-- DropIndex
DROP INDEX "pipeline_stages_pipeline_id_type_key";

-- AlterTable: HiringPipeline
ALTER TABLE "hiring_pipelines" ADD COLUMN "tenant_id" UUID;
ALTER TABLE "hiring_pipelines" ADD COLUMN "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Transitional backfill for existing development data: assign existing pipelines to AMA tenant
UPDATE "hiring_pipelines"
SET "tenant_id" = 'e6759b00-099e-443a-8aa5-2bfc67b191ea'
WHERE "tenant_id" IS NULL;

ALTER TABLE "hiring_pipelines" ALTER COLUMN "tenant_id" SET NOT NULL;

-- CreateTable: PipelineVersion
CREATE TABLE "pipeline_versions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "pipeline_id" UUID NOT NULL,
    "version" INTEGER NOT NULL,
    "status" "pipeline_version_status" NOT NULL DEFAULT 'DRAFT',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "published_at" TIMESTAMPTZ(6),

    CONSTRAINT "pipeline_versions_pkey" PRIMARY KEY ("id")
);

-- Transitional backfill: ensure version 1 exists for any existing pipelines
INSERT INTO "pipeline_versions" ("id", "tenant_id", "pipeline_id", "version", "status", "created_at", "updated_at")
SELECT gen_random_uuid(), "tenant_id", "id", 1, 'DRAFT', NOW(), NOW()
FROM "hiring_pipelines"
ON CONFLICT DO NOTHING;

-- AlterTable: PipelineStage
ALTER TABLE "pipeline_stages" ADD COLUMN "pipeline_version_id" UUID;
ALTER TABLE "pipeline_stages" ADD COLUMN "category" "stage_categories";
ALTER TABLE "pipeline_stages" ADD COLUMN "is_initial" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "pipeline_stages" ADD COLUMN "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Link existing stages to version 1
UPDATE "pipeline_stages" ps
SET "pipeline_version_id" = pv.id
FROM "pipeline_versions" pv
WHERE ps.pipeline_id = pv.pipeline_id;

-- Map old stage types to categories
UPDATE "pipeline_stages" SET "category" = 'APPLIED' WHERE "type"::text = 'APPLIED';
UPDATE "pipeline_stages" SET "category" = 'SCREENING' WHERE "type"::text = 'SCREENING';
UPDATE "pipeline_stages" SET "category" = 'INTERVIEW' WHERE "type"::text = 'INTERVIEW';
UPDATE "pipeline_stages" SET "category" = 'OFFER' WHERE "type"::text = 'OFFER';
UPDATE "pipeline_stages" SET "category" = 'OTHER' WHERE "type"::text IN ('HIRED', 'REJECTED');
UPDATE "pipeline_stages" SET "category" = 'OTHER' WHERE "category" IS NULL;

-- Set initial stage on order = 1
UPDATE "pipeline_stages" SET "is_initial" = true WHERE "order" = 1;

-- Enforce NOT NULL on new columns
ALTER TABLE "pipeline_stages" ALTER COLUMN "pipeline_version_id" SET NOT NULL;
ALTER TABLE "pipeline_stages" ALTER COLUMN "category" SET NOT NULL;

-- Drop legacy columns
ALTER TABLE "pipeline_stages" DROP COLUMN "is_final";
ALTER TABLE "pipeline_stages" DROP COLUMN "pipeline_id";
ALTER TABLE "pipeline_stages" DROP COLUMN "type";

-- DropEnum
DROP TYPE "stage_types";

-- CreateIndex
CREATE INDEX "pipeline_versions_tenant_id_idx" ON "pipeline_versions"("tenant_id");

-- CreateIndex
CREATE INDEX "pipeline_versions_pipeline_id_idx" ON "pipeline_versions"("pipeline_id");

-- CreateIndex
CREATE UNIQUE INDEX "pipeline_versions_pipeline_id_version_key" ON "pipeline_versions"("pipeline_id", "version");

-- CreateIndex
CREATE UNIQUE INDEX "pipeline_versions_tenant_id_id_key" ON "pipeline_versions"("tenant_id", "id");

-- CreateIndex
CREATE INDEX "hiring_pipelines_tenant_id_idx" ON "hiring_pipelines"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "hiring_pipelines_tenant_id_name_key" ON "hiring_pipelines"("tenant_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "hiring_pipelines_tenant_id_id_key" ON "hiring_pipelines"("tenant_id", "id");

-- CreateIndex
CREATE INDEX "pipeline_stages_pipeline_version_id_idx" ON "pipeline_stages"("pipeline_version_id");

-- CreateIndex
CREATE UNIQUE INDEX "pipeline_stages_pipeline_version_id_order_key" ON "pipeline_stages"("pipeline_version_id", "order");

-- AddForeignKey
ALTER TABLE "hiring_pipelines" ADD CONSTRAINT "hiring_pipelines_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pipeline_versions" ADD CONSTRAINT "pipeline_versions_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pipeline_versions" ADD CONSTRAINT "pipeline_versions_tenant_id_pipeline_id_fkey" FOREIGN KEY ("tenant_id", "pipeline_id") REFERENCES "hiring_pipelines"("tenant_id", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pipeline_stages" ADD CONSTRAINT "pipeline_stages_pipeline_version_id_fkey" FOREIGN KEY ("pipeline_version_id") REFERENCES "pipeline_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
