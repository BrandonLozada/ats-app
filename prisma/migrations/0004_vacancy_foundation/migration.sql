-- CreateEnum
CREATE TYPE "vacancy_status" AS ENUM ('DRAFT', 'PUBLISHED', 'PAUSED', 'CLOSED');

-- CreateEnum
CREATE TYPE "hiring_team_roles" AS ENUM ('RECRUITER', 'HIRING_MANAGER', 'INTERVIEWER');

-- CreateTable
CREATE TABLE "vacancies" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "department_id" UUID NOT NULL,
    "legal_entity_id" UUID NOT NULL,
    "pipeline_version_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "employment_type" "employment_types",
    "is_remote" BOOLEAN NOT NULL DEFAULT false,
    "openings" INTEGER NOT NULL DEFAULT 1,
    "status" "vacancy_status" NOT NULL DEFAULT 'DRAFT',
    "published_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vacancies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vacancy_locations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "vacancy_id" UUID NOT NULL,
    "legal_entity_id" UUID NOT NULL,
    "location_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vacancy_locations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hiring_team_members" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "vacancy_id" UUID NOT NULL,
    "tenant_membership_id" UUID NOT NULL,
    "responsibility" "hiring_team_roles" NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "hiring_team_members_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "vacancies_tenant_id_idx" ON "vacancies"("tenant_id");

-- CreateIndex
CREATE INDEX "vacancies_tenant_id_status_idx" ON "vacancies"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "vacancies_department_id_idx" ON "vacancies"("department_id");

-- CreateIndex
CREATE INDEX "vacancies_legal_entity_id_idx" ON "vacancies"("legal_entity_id");

-- CreateIndex
CREATE INDEX "vacancies_pipeline_version_id_idx" ON "vacancies"("pipeline_version_id");

-- CreateIndex
CREATE UNIQUE INDEX "vacancies_tenant_id_slug_key" ON "vacancies"("tenant_id", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "vacancies_tenant_id_id_key" ON "vacancies"("tenant_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "vacancies_tenant_id_id_legal_entity_id_key" ON "vacancies"("tenant_id", "id", "legal_entity_id");

-- CreateIndex
CREATE INDEX "vacancy_locations_tenant_id_idx" ON "vacancy_locations"("tenant_id");

-- CreateIndex
CREATE INDEX "vacancy_locations_vacancy_id_idx" ON "vacancy_locations"("vacancy_id");

-- CreateIndex
CREATE INDEX "vacancy_locations_location_id_idx" ON "vacancy_locations"("location_id");

-- CreateIndex
CREATE UNIQUE INDEX "vacancy_locations_vacancy_id_location_id_key" ON "vacancy_locations"("vacancy_id", "location_id");

-- CreateIndex
CREATE INDEX "hiring_team_members_tenant_id_idx" ON "hiring_team_members"("tenant_id");

-- CreateIndex
CREATE INDEX "hiring_team_members_vacancy_id_idx" ON "hiring_team_members"("vacancy_id");

-- CreateIndex
CREATE INDEX "hiring_team_members_tenant_membership_id_idx" ON "hiring_team_members"("tenant_membership_id");

-- CreateIndex
CREATE UNIQUE INDEX "hiring_team_members_vacancy_id_tenant_membership_id_key" ON "hiring_team_members"("vacancy_id", "tenant_membership_id");

-- CreateIndex
CREATE UNIQUE INDEX "departments_tenant_id_id_key" ON "departments"("tenant_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "locations_tenant_id_legal_entity_id_id_key" ON "locations"("tenant_id", "legal_entity_id", "id");

-- AddForeignKey
ALTER TABLE "vacancies" ADD CONSTRAINT "vacancies_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vacancies" ADD CONSTRAINT "vacancies_tenant_id_department_id_fkey" FOREIGN KEY ("tenant_id", "department_id") REFERENCES "departments"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vacancies" ADD CONSTRAINT "vacancies_tenant_id_legal_entity_id_fkey" FOREIGN KEY ("tenant_id", "legal_entity_id") REFERENCES "legal_entities"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vacancies" ADD CONSTRAINT "vacancies_tenant_id_pipeline_version_id_fkey" FOREIGN KEY ("tenant_id", "pipeline_version_id") REFERENCES "pipeline_versions"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vacancy_locations" ADD CONSTRAINT "vacancy_locations_tenant_id_vacancy_id_legal_entity_id_fkey" FOREIGN KEY ("tenant_id", "vacancy_id", "legal_entity_id") REFERENCES "vacancies"("tenant_id", "id", "legal_entity_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vacancy_locations" ADD CONSTRAINT "vacancy_locations_tenant_id_legal_entity_id_location_id_fkey" FOREIGN KEY ("tenant_id", "legal_entity_id", "location_id") REFERENCES "locations"("tenant_id", "legal_entity_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hiring_team_members" ADD CONSTRAINT "hiring_team_members_tenant_id_vacancy_id_fkey" FOREIGN KEY ("tenant_id", "vacancy_id") REFERENCES "vacancies"("tenant_id", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hiring_team_members" ADD CONSTRAINT "hiring_team_members_tenant_id_tenant_membership_id_fkey" FOREIGN KEY ("tenant_id", "tenant_membership_id") REFERENCES "tenant_memberships"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
