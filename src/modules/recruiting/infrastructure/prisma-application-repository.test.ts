import { describe, it, expect } from "vitest";
import { Prisma } from "@/generated/prisma/client";
import {
  isActiveApplicationUniqueViolation,
} from "./prisma-application-repository";
import { ApplicationAlreadyActiveException } from "../application/application/ports/application-repository";
import { createApplicationUseCase } from "../application/application/create-application";
import type { AuthenticatedContext } from "@/modules/organization/public";

describe("PrismaApplicationRepository P2002 Mapping (Infrastructure Adapter)", () => {
  const activeConstraintName = "applications_active_tenant_candidate_vacancy_key";

  function createP2002Error(meta: Record<string, unknown>, message?: string): Prisma.PrismaClientKnownRequestError {
    return new Prisma.PrismaClientKnownRequestError(
      message || `Unique constraint failed on the constraint: \`${meta.constraint || meta.target}\``,
      {
        code: "P2002",
        clientVersion: "7.6.0",
        meta,
      }
    );
  }

  describe("isActiveApplicationUniqueViolation", () => {
    it("returns true when meta.constraint matches active constraint exactly", () => {
      const error = createP2002Error({ constraint: activeConstraintName });
      expect(isActiveApplicationUniqueViolation(error)).toBe(true);
    });

    it("returns true when meta.target string matches active constraint exactly", () => {
      const error = createP2002Error({ target: activeConstraintName });
      expect(isActiveApplicationUniqueViolation(error)).toBe(true);
    });

    it("returns true when meta.target array contains active constraint", () => {
      const error = createP2002Error({ target: [activeConstraintName] });
      expect(isActiveApplicationUniqueViolation(error)).toBe(true);
    });

    it("returns true when driverAdapterError contains exact index name", () => {
      const error = createP2002Error({
        driverAdapterError: {
          cause: {
            constraint: {
              index: activeConstraintName,
            },
          },
        },
      });
      expect(isActiveApplicationUniqueViolation(error)).toBe(true);
    });

    it("returns true when error message contains active constraint name", () => {
      const error = new Prisma.PrismaClientKnownRequestError(
        `Unique constraint failed on the constraint: \`${activeConstraintName}\``,
        {
          code: "P2002",
          clientVersion: "7.6.0",
          meta: {},
        }
      );
      expect(isActiveApplicationUniqueViolation(error)).toBe(true);
    });

    it("returns false for unrelated unique constraints", () => {
      const unrelatedErrors = [
        createP2002Error({ constraint: "User_email_key" }),
        createP2002Error({ target: "Candidate_email_key" }),
        createP2002Error({ target: ["email"] }),
        createP2002Error({ constraint: "applications_candidate_id_job_posting_id_key" }),
        createP2002Error({ target: ["tenant_id", "candidate_id", "vacancy_id"] }), // Broad column-only inference must NOT match
      ];

      for (const err of unrelatedErrors) {
        expect(isActiveApplicationUniqueViolation(err)).toBe(false);
      }
    });

    it("returns false for prefix/suffix substring variations in meta.constraint, meta.target, and message", () => {
      // 1. meta.constraint false positive with prefix/suffix
      const errConstraint = createP2002Error({
        constraint: "backup_applications_active_tenant_candidate_vacancy_key_old",
      });
      expect(isActiveApplicationUniqueViolation(errConstraint)).toBe(false);

      // 2. meta.target string false positive with suffix
      const errTargetStr = createP2002Error({
        target: "applications_active_tenant_candidate_vacancy_key_archive",
      });
      expect(isActiveApplicationUniqueViolation(errTargetStr)).toBe(false);

      // 3. meta.target array false positive with prefix
      const errTargetArr = createP2002Error({
        target: ["prefix_applications_active_tenant_candidate_vacancy_key"],
      });
      expect(isActiveApplicationUniqueViolation(errTargetArr)).toBe(false);

      // 4. message fallback false positive with prefix/suffix
      const errMessage = new Prisma.PrismaClientKnownRequestError(
        "Unique constraint failed on: backup_applications_active_tenant_candidate_vacancy_key_old",
        {
          code: "P2002",
          clientVersion: "7.6.0",
          meta: {},
        }
      );
      expect(isActiveApplicationUniqueViolation(errMessage)).toBe(false);
    });

    it("returns false for non-P2002 errors", () => {
      const nonP2002 = new Prisma.PrismaClientKnownRequestError("Foreign key violation", {
        code: "P2003",
        clientVersion: "7.6.0",
        meta: { field_name: "vacancyId" },
      });
      expect(isActiveApplicationUniqueViolation(nonP2002)).toBe(false);

      expect(isActiveApplicationUniqueViolation(new Error("Generic error"))).toBe(false);
      expect(isActiveApplicationUniqueViolation(null)).toBe(false);
      expect(isActiveApplicationUniqueViolation(undefined)).toBe(false);
    });
  });

  describe("Use Case Integration with Unrelated vs Active P2002", () => {
    const validCtx: AuthenticatedContext = {
      actor: {
        userId: "98300000-0000-4000-a000-000000000001",
        email: "recruiter@test.com",
        name: "Recruiter",
      },
      tenant: {
        tenantId: "98300000-0000-4000-a000-000000000002",
        slug: "test-tenant",
        name: "Test Tenant",
      },
      membership: {
        membershipId: "98300000-0000-4000-a000-000000000003",
      },
      roles: ["recruiter"],
      permissions: ["application.create"],
    };

    it("maps exact active unique violation to APPLICATION_ALREADY_ACTIVE", async () => {
      // Create a mock repo where createApplicationWithInitialHistory throws ApplicationAlreadyActiveException
      const repo = {
        findCandidateInTenant: async () => ({ id: "c1", tenantId: validCtx.tenant.tenantId }),
        findVacancyForApplication: async () => ({
          id: "v1",
          tenantId: validCtx.tenant.tenantId,
          status: "PUBLISHED",
          pipelineVersionId: "pv1",
        }),
        findInitialStagesForPipelineVersion: async () => [
          { id: "s1", pipelineVersionId: "pv1", category: "APPLIED", isInitial: true },
        ],
        checkVacancyLocationBelongsToVacancyAndTenant: async () => true,
        checkApplicationSourceExists: async () => true,
        findActiveApplication: async () => null,
        createApplicationWithInitialHistory: async () => {
          throw new ApplicationAlreadyActiveException();
        },
      };

      const useCase = createApplicationUseCase(repo);
      const result = await useCase(validCtx, {
        candidateId: "98300000-0000-4000-a000-000000000011",
        vacancyId: "98300000-0000-4000-a000-000000000012",
      });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe("APPLICATION_ALREADY_ACTIVE");
      }
    });

    it("maps unrelated P2002 error to APPLICATION_REPOSITORY_ERROR and does not leak constraint details", async () => {
      const unrelatedConstraint = "unrelated_unique_constraint_key";
      const unrelatedP2002 = createP2002Error(
        { constraint: unrelatedConstraint },
        `Unique constraint failed on the constraint: \`${unrelatedConstraint}\``
      );

      const repo = {
        findCandidateInTenant: async () => ({ id: "c1", tenantId: validCtx.tenant.tenantId }),
        findVacancyForApplication: async () => ({
          id: "v1",
          tenantId: validCtx.tenant.tenantId,
          status: "PUBLISHED",
          pipelineVersionId: "pv1",
        }),
        findInitialStagesForPipelineVersion: async () => [
          { id: "s1", pipelineVersionId: "pv1", category: "APPLIED", isInitial: true },
        ],
        checkVacancyLocationBelongsToVacancyAndTenant: async () => true,
        checkApplicationSourceExists: async () => true,
        findActiveApplication: async () => null,
        createApplicationWithInitialHistory: async () => {
          // If PrismaApplicationRepository received an unrelated P2002, it rethrows it:
          if (isActiveApplicationUniqueViolation(unrelatedP2002)) {
            throw new ApplicationAlreadyActiveException();
          }
          throw unrelatedP2002;
        },
      };

      const useCase = createApplicationUseCase(repo);
      const result = await useCase(validCtx, {
        candidateId: "98300000-0000-4000-a000-000000000011",
        vacancyId: "98300000-0000-4000-a000-000000000012",
      });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe("APPLICATION_REPOSITORY_ERROR");
        expect(result.error.message).not.toContain(unrelatedConstraint);
        expect(result.error.message).not.toContain("P2002");
        expect(result.error.message).not.toContain("Unique constraint failed");
      }
    });
  });
});
