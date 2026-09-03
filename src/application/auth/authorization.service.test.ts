import { describe, it, expect, vi, beforeEach } from "vitest";
import { AuthorizationService } from "./authorization.service";
import { PrismaService } from "@/infrastructure/database/prisma.service";

interface MockMembershipResult {
  id: string;
  tenantId: string;
  userId: string;
  status: "ACTIVE" | "INACTIVE";
  membershipRoles: Array<{
    role: {
      name: string;
      systemKey: string | null;
      permissions: Array<{
        permission: {
          name: string;
        };
      }>;
    };
  }>;
}

interface MockFindUniqueArgs {
  where: {
    tenantId_userId: {
      tenantId: string;
      userId: string;
    };
  };
}

type MockTenantMembershipReader = {
  mockImplementation: (fn: (args: MockFindUniqueArgs) => Promise<MockMembershipResult | null>) => void;
  mockResolvedValue: (val: MockMembershipResult | null) => void;
};

describe("AuthorizationService (Tenant-Aware Authorization)", () => {
  const userId = "usr_123e4567-e89b-12d3-a456-426614174000";
  const tenantA = "aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa";
  const tenantB = "bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb";

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("evaluates permissions strictly within requested tenant boundary and never returns union across tenants", async () => {
    // Mock scenario:
    // Tenant A: Role Admin with Permission 'tenant.manage'
    // Tenant B: Role Recruiter with Permission 'application.read'
    const findUniqueMock = vi.spyOn(
      PrismaService.client.tenantMembership,
      "findUnique",
    ) as unknown as MockTenantMembershipReader;

    findUniqueMock.mockImplementation(async (args: MockFindUniqueArgs) => {
      const { tenantId, userId: reqUserId } = args.where.tenantId_userId;
      if (reqUserId !== userId) return null;

      if (tenantId === tenantA) {
        return {
          id: "membership-a",
          tenantId: tenantA,
          userId,
          status: "ACTIVE",
          membershipRoles: [
            {
              role: {
                name: "Admin",
                systemKey: "TENANT_ADMIN",
                permissions: [
                  { permission: { name: "tenant.manage" } },
                ],
              },
            },
          ],
        };
      }

      if (tenantId === tenantB) {
        return {
          id: "membership-b",
          tenantId: tenantB,
          userId,
          status: "ACTIVE",
          membershipRoles: [
            {
              role: {
                name: "Recruiter",
                systemKey: "RECRUITER",
                permissions: [
                  { permission: { name: "application.read" } },
                ],
              },
            },
          ],
        };
      }

      return null;
    });

    // Evaluating Tenant A:
    const permsA = await AuthorizationService.getUserPermissions(userId, tenantA);
    expect(permsA).toContain("tenant.manage");
    expect(permsA).not.toContain("application.read");
    expect(permsA).toEqual(["tenant.manage"]);

    const rolesA = await AuthorizationService.getUserRoles(userId, tenantA);
    expect(rolesA).toContain("Admin");
    expect(rolesA).toContain("TENANT_ADMIN");
    expect(rolesA).not.toContain("Recruiter");

    expect(await AuthorizationService.hasPermission(userId, tenantA, "tenant.manage")).toBe(true);
    expect(await AuthorizationService.hasPermission(userId, tenantA, "application.read")).toBe(false);

    // Evaluating Tenant B:
    const permsB = await AuthorizationService.getUserPermissions(userId, tenantB);
    expect(permsB).toContain("application.read");
    expect(permsB).not.toContain("tenant.manage");
    expect(permsB).toEqual(["application.read"]);

    const rolesB = await AuthorizationService.getUserRoles(userId, tenantB);
    expect(rolesB).toContain("Recruiter");
    expect(rolesB).toContain("RECRUITER");
    expect(rolesB).not.toContain("Admin");

    expect(await AuthorizationService.hasPermission(userId, tenantB, "application.read")).toBe(true);
    expect(await AuthorizationService.hasPermission(userId, tenantB, "tenant.manage")).toBe(false);
  });

  it("fails closed (returns empty arrays/false) when membership is INACTIVE", async () => {
    const findUniqueMock = vi.spyOn(
      PrismaService.client.tenantMembership,
      "findUnique",
    ) as unknown as MockTenantMembershipReader;

    findUniqueMock.mockResolvedValue({
      id: "membership-inactive",
      tenantId: tenantA,
      userId,
      status: "INACTIVE",
      membershipRoles: [
        {
          role: {
            name: "Admin",
            systemKey: "TENANT_ADMIN",
            permissions: [{ permission: { name: "tenant.manage" } }],
          },
        },
      ],
    });

    const perms = await AuthorizationService.getUserPermissions(userId, tenantA);
    expect(perms).toEqual([]);

    const roles = await AuthorizationService.getUserRoles(userId, tenantA);
    expect(roles).toEqual([]);

    expect(await AuthorizationService.hasPermission(userId, tenantA, "tenant.manage")).toBe(false);
  });

  it("fails closed when tenantId or userId is missing", async () => {
    expect(await AuthorizationService.getUserPermissions("", tenantA)).toEqual([]);
    expect(await AuthorizationService.getUserPermissions(userId, "")).toEqual([]);
    expect(await AuthorizationService.getUserRoles("", tenantA)).toEqual([]);
    expect(await AuthorizationService.getUserRoles(userId, "")).toEqual([]);
    expect(await AuthorizationService.hasPermission(userId, "", "tenant.manage")).toBe(false);
    expect(await AuthorizationService.hasPermission("", tenantA, "tenant.manage")).toBe(false);
  });
});
