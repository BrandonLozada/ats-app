-- Precondition: Fail closed if canonical active duplicate rows exist
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "applications"
    WHERE "tenant_id" IS NOT NULL
      AND "vacancy_id" IS NOT NULL
      AND "outcome" = 'NONE'::"application_outcomes"
    GROUP BY "tenant_id", "candidate_id", "vacancy_id"
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION 'I6-S6-T03 PRECONDITION FAILED: Duplicate active applications exist for tenant_id, candidate_id, vacancy_id';
  END IF;
END $$;

-- DropForeignKey
ALTER TABLE "application_stage_history" DROP CONSTRAINT "application_stage_history_application_id_fkey";

-- DropForeignKey
ALTER TABLE "applications" DROP CONSTRAINT "applications_assigned_vacancy_location_id_fkey";

-- DropForeignKey
ALTER TABLE "applications" DROP CONSTRAINT "applications_candidate_id_fkey";

-- DropForeignKey
ALTER TABLE "applications" DROP CONSTRAINT "applications_vacancy_id_fkey";

-- CreateIndex
CREATE INDEX "application_stage_history_tenant_id_application_id_idx" ON "application_stage_history"("tenant_id", "application_id");

-- CreateIndex
CREATE UNIQUE INDEX "applications_tenant_id_id_key" ON "applications"("tenant_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "applications_active_tenant_candidate_vacancy_key" ON "applications"("tenant_id", "candidate_id", "vacancy_id") WHERE ("outcome" = 'NONE');

-- AddForeignKey
ALTER TABLE "applications" ADD CONSTRAINT "applications_tenant_id_candidate_id_fkey" FOREIGN KEY ("tenant_id", "candidate_id") REFERENCES "candidates"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "applications" ADD CONSTRAINT "applications_tenant_id_vacancy_id_fkey" FOREIGN KEY ("tenant_id", "vacancy_id") REFERENCES "vacancies"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "applications" ADD CONSTRAINT "applications_tenant_id_vacancy_id_assigned_vacancy_locatio_fkey" FOREIGN KEY ("tenant_id", "vacancy_id", "assigned_vacancy_location_id") REFERENCES "vacancy_locations"("tenant_id", "vacancy_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "application_stage_history" ADD CONSTRAINT "application_stage_history_tenant_id_application_id_fkey" FOREIGN KEY ("tenant_id", "application_id") REFERENCES "applications"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
