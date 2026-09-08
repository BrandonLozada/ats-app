-- Fail-closed precondition guard
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "candidates" LIMIT 1) THEN
    RAISE EXCEPTION
      'I6-S5-T01 BLOCKED: Candidate rows exist; controlled tenant/normalization backfill required before migration 0006';
  END IF;
END $$;

-- DropForeignKey
ALTER TABLE "candidates" DROP CONSTRAINT IF EXISTS "candidates_user_id_fkey";

-- DropIndex
DROP INDEX IF EXISTS "candidates_email_idx";

-- DropIndex
DROP INDEX IF EXISTS "candidates_user_id_key";

-- AlterTable: Value-preserving rename of account-claim column
ALTER TABLE "candidates" RENAME COLUMN "user_id" TO "auth_user_id";

-- AlterTable: Add required tenant and normalized columns, enforce email NOT NULL
ALTER TABLE "candidates"
ADD COLUMN     "email_normalized" TEXT NOT NULL,
ADD COLUMN     "phone_normalized" TEXT,
ADD COLUMN     "tenant_id" UUID NOT NULL,
ALTER COLUMN "email" SET NOT NULL;

-- CreateTable
CREATE TABLE "data_provenance" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "candidate_id" UUID NOT NULL,
    "source" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "collected_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "data_provenance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "privacy_policy_versions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "version" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "published_at" TIMESTAMPTZ(6),
    "is_active" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "privacy_policy_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "privacy_acknowledgments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "candidate_id" UUID NOT NULL,
    "policy_version_id" UUID NOT NULL,
    "acknowledged_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "privacy_acknowledgments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "data_provenance_tenant_id_idx" ON "data_provenance"("tenant_id");

-- CreateIndex
CREATE INDEX "data_provenance_tenant_id_candidate_id_idx" ON "data_provenance"("tenant_id", "candidate_id");

-- CreateIndex
CREATE INDEX "privacy_policy_versions_tenant_id_is_active_idx" ON "privacy_policy_versions"("tenant_id", "is_active");

-- CreateIndex
CREATE UNIQUE INDEX "privacy_policy_versions_tenant_id_id_key" ON "privacy_policy_versions"("tenant_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "privacy_policy_versions_tenant_id_version_key" ON "privacy_policy_versions"("tenant_id", "version");

-- CreateIndex
CREATE INDEX "privacy_acknowledgments_tenant_id_idx" ON "privacy_acknowledgments"("tenant_id");

-- CreateIndex
CREATE INDEX "privacy_acknowledgments_tenant_id_candidate_id_idx" ON "privacy_acknowledgments"("tenant_id", "candidate_id");

-- CreateIndex
CREATE INDEX "privacy_acknowledgments_tenant_id_policy_version_id_idx" ON "privacy_acknowledgments"("tenant_id", "policy_version_id");

-- CreateIndex
CREATE INDEX "candidates_tenant_id_idx" ON "candidates"("tenant_id");

-- CreateIndex
CREATE INDEX "candidates_tenant_id_email_normalized_idx" ON "candidates"("tenant_id", "email_normalized");

-- CreateIndex
CREATE INDEX "candidates_tenant_id_phone_normalized_idx" ON "candidates"("tenant_id", "phone_normalized");

-- CreateIndex
CREATE UNIQUE INDEX "candidates_tenant_id_id_key" ON "candidates"("tenant_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "candidates_tenant_id_auth_user_id_key" ON "candidates"("tenant_id", "auth_user_id");

-- AddForeignKey
ALTER TABLE "candidates" ADD CONSTRAINT "candidates_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidates" ADD CONSTRAINT "candidates_auth_user_id_fkey" FOREIGN KEY ("auth_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "data_provenance" ADD CONSTRAINT "data_provenance_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "data_provenance" ADD CONSTRAINT "data_provenance_tenant_id_candidate_id_fkey" FOREIGN KEY ("tenant_id", "candidate_id") REFERENCES "candidates"("tenant_id", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "privacy_policy_versions" ADD CONSTRAINT "privacy_policy_versions_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "privacy_acknowledgments" ADD CONSTRAINT "privacy_acknowledgments_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "privacy_acknowledgments" ADD CONSTRAINT "privacy_acknowledgments_tenant_id_candidate_id_fkey" FOREIGN KEY ("tenant_id", "candidate_id") REFERENCES "candidates"("tenant_id", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "privacy_acknowledgments" ADD CONSTRAINT "privacy_acknowledgments_tenant_id_policy_version_id_fkey" FOREIGN KEY ("tenant_id", "policy_version_id") REFERENCES "privacy_policy_versions"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
