-- CreateEnum
CREATE TYPE "application_outcomes" AS ENUM ('NONE', 'HIRED', 'REJECTED', 'WITHDRAWN', 'CANCELLED');

-- DropForeignKey
ALTER TABLE "applications" DROP CONSTRAINT "applications_job_posting_id_fkey";

-- DropForeignKey
ALTER TABLE "applications" DROP CONSTRAINT "applications_stage_id_fkey";

-- AlterTable
ALTER TABLE "application_stage_history" ADD COLUMN     "tenant_id" UUID;

-- AlterTable
ALTER TABLE "applications" ADD COLUMN     "assigned_vacancy_location_id" UUID,
ADD COLUMN     "current_stage_id" UUID,
ADD COLUMN     "outcome" "application_outcomes" NOT NULL DEFAULT 'NONE',
ADD COLUMN     "tenant_id" UUID,
ADD COLUMN     "vacancy_id" UUID,
ALTER COLUMN "job_posting_id" DROP NOT NULL,
ALTER COLUMN "stage_id" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "application_stage_history_tenant_id_idx" ON "application_stage_history"("tenant_id");

-- CreateIndex
CREATE INDEX "applications_tenant_id_idx" ON "applications"("tenant_id");

-- CreateIndex
CREATE INDEX "applications_tenant_id_vacancy_id_idx" ON "applications"("tenant_id", "vacancy_id");

-- CreateIndex
CREATE INDEX "applications_tenant_id_candidate_id_idx" ON "applications"("tenant_id", "candidate_id");

-- CreateIndex
CREATE INDEX "applications_tenant_id_current_stage_id_idx" ON "applications"("tenant_id", "current_stage_id");

-- CreateIndex
CREATE INDEX "applications_tenant_id_outcome_idx" ON "applications"("tenant_id", "outcome");

-- CreateIndex
CREATE INDEX "applications_vacancy_id_idx" ON "applications"("vacancy_id");

-- CreateIndex
CREATE INDEX "applications_current_stage_id_idx" ON "applications"("current_stage_id");

-- CreateIndex
CREATE INDEX "applications_assigned_vacancy_location_id_idx" ON "applications"("assigned_vacancy_location_id");

-- CreateIndex
CREATE UNIQUE INDEX "vacancy_locations_tenant_id_vacancy_id_id_key" ON "vacancy_locations"("tenant_id", "vacancy_id", "id");

-- AddForeignKey
ALTER TABLE "applications" ADD CONSTRAINT "applications_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "applications" ADD CONSTRAINT "applications_job_posting_id_fkey" FOREIGN KEY ("job_posting_id") REFERENCES "job_postings"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "applications" ADD CONSTRAINT "applications_vacancy_id_fkey" FOREIGN KEY ("vacancy_id") REFERENCES "vacancies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "applications" ADD CONSTRAINT "applications_stage_id_fkey" FOREIGN KEY ("stage_id") REFERENCES "pipeline_stages"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "applications" ADD CONSTRAINT "applications_current_stage_id_fkey" FOREIGN KEY ("current_stage_id") REFERENCES "pipeline_stages"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "applications" ADD CONSTRAINT "applications_assigned_vacancy_location_id_fkey" FOREIGN KEY ("assigned_vacancy_location_id") REFERENCES "vacancy_locations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "application_stage_history" ADD CONSTRAINT "application_stage_history_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
