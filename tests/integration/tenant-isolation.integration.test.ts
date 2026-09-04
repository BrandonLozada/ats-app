import "dotenv/config";
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "@/infrastructure/database/prisma.client";
import { PrismaAuthenticatedMembershipReader } from "@/modules/organization/infrastructure/prisma-authenticated-membership-reader";
import { PrismaPublicTenantReader } from "@/modules/organization/infrastructure/prisma-public-tenant-reader";
import { createPublicTenantResolver } from "@/modules/organization/application/resolve-public-tenant-context";
import { createAuthenticatedContextResolver } from "@/modules/organization/application/resolve-authenticated-context";
import type { CurrentActor } from "@/modules/identity/public.server";

describe("PostgreSQL Tenant Isolation Integration Tests", () => {
  // Deterministic UUIDs for test fixtures
  const tenantAId = "90000000-0000-4000-b000-000000000001";
  const tenantBId = "90000000-0000-4000-b000-000000000002";
  const tenantInactiveId = "90000000-0000-4000-b000-000000000003";

  const userAId = "90000000-0000-4000-a000-000000000001";
  const userInactiveId = "90000000-0000-4000-a000-000000000002";
  const userNoMembershipId = "90000000-0000-4000-a000-000000000003";

  const membershipAId = "90000000-0000-4000-c000-000000000001";
  const membershipBId = "90000000-0000-4000-c000-000000000002";
  const membershipInactiveId = "90000000-0000-4000-c000-000000000003";

  const roleAId = "90000000-0000-4000-d000-000000000001";
  const roleBId = "90000000-0000-4000-d000-000000000002";
  const roleBCustomId = "90000000-0000-4000-d000-000000000003";

  const currentActorA: CurrentActor = {
    userId: userAId,
    email: "iso-user-a@example.com",
    name: "Isolation User A",
  };

  const currentActorInactive: CurrentActor = {
    userId: userInactiveId,
    email: "iso-user-inactive@example.com",
    name: "Isolation User Inactive",
  };

  const currentActorNoMembership: CurrentActor = {
    userId: userNoMembershipId,
    email: "iso-user-nomember@example.com",
    name: "Isolation User No Membership",
  };

  const membershipReader = new PrismaAuthenticatedMembershipReader();
  const publicTenantReader = new PrismaPublicTenantReader();
  const publicTenantResolver = createPublicTenantResolver(publicTenantReader);

  async function cleanTestData(): Promise<void> {
    const tenantIds = [tenantAId, tenantBId, tenantInactiveId];
    const userIds = [userAId, userInactiveId, userNoMembershipId];

    await prisma.membershipRole.deleteMany({
      where: { tenantId: { in: tenantIds } },
    });
    await prisma.tenantMembership.deleteMany({
      where: { tenantId: { in: tenantIds } },
    });
    await prisma.rolePermission.deleteMany({
      where: { role: { tenantId: { in: tenantIds } } },
    });
    await prisma.role.deleteMany({
      where: { tenantId: { in: tenantIds } },
    });
    await prisma.tenant.deleteMany({
      where: { id: { in: tenantIds } },
    });
    await prisma.user.deleteMany({
      where: { id: { in: userIds } },
    });
  }

  beforeAll(async () => {
    await cleanTestData();

    // 1. Create Users
    await prisma.user.createMany({
      data: [
        {
          id: userAId,
          email: "iso-user-a@example.com",
          name: "Isolation User A",
          updatedAt: new Date(),
        },
        {
          id: userInactiveId,
          email: "iso-user-inactive@example.com",
          name: "Isolation User Inactive",
          updatedAt: new Date(),
        },
        {
          id: userNoMembershipId,
          email: "iso-user-nomember@example.com",
          name: "Isolation User No Membership",
          updatedAt: new Date(),
        },
      ],
    });

    // 2. Create Tenants
    await prisma.tenant.createMany({
      data: [
        {
          id: tenantAId,
          name: "Isolation Tenant Alpha",
          slug: "iso-tenant-a",
          isActive: true,
          updatedAt: new Date(),
        },
        {
          id: tenantBId,
          name: "Isolation Tenant Beta",
          slug: "iso-tenant-b",
          isActive: true,
          updatedAt: new Date(),
        },
        {
          id: tenantInactiveId,
          name: "Isolation Tenant Inactive",
          slug: "iso-tenant-inactive",
          isActive: false,
          updatedAt: new Date(),
        },
      ],
    });

    // 3. Ensure global permissions exist
    const perms = ["tenant.manage", "vacancy.create", "candidate.read", "candidate.create", "application.read"];
    for (const name of perms) {
      await prisma.permission.upsert({
        where: { name },
        update: {},
        create: { name },
      });
    }

    const dbPerms = await prisma.permission.findMany({
      where: { name: { in: perms } },
    });
    const permMap = new Map(dbPerms.map((p) => [p.name, p.id]));

    // 4. Create Roles
    // Tenant A: System role TENANT_ADMIN
    await prisma.role.create({
      data: {
        id: roleAId,
        tenantId: tenantAId,
        name: "Tenant Admin",
        systemKey: "TENANT_ADMIN",
        isSystem: true,
        updatedAt: new Date(),
        permissions: {
          create: [
            { permissionId: permMap.get("tenant.manage")! },
            { permissionId: permMap.get("vacancy.create")! },
          ],
        },
      },
    });

    // Tenant B: System role RECRUITER
    await prisma.role.create({
      data: {
        id: roleBId,
        tenantId: tenantBId,
        name: "Recruiter",
        systemKey: "RECRUITER",
        isSystem: true,
        updatedAt: new Date(),
        permissions: {
          create: [
            { permissionId: permMap.get("candidate.read")! },
            { permissionId: permMap.get("candidate.create")! },
          ],
        },
      },
    });

    // Tenant B: Custom role "Custom Reviewer" (systemKey is null, falls back to name)
    await prisma.role.create({
      data: {
        id: roleBCustomId,
        tenantId: tenantBId,
        name: "Custom Reviewer",
        systemKey: null,
        isSystem: false,
        updatedAt: new Date(),
        permissions: {
          create: [{ permissionId: permMap.get("application.read")! }],
        },
      },
    });

    // 5. Create TenantMemberships
    await prisma.tenantMembership.createMany({
      data: [
        {
          id: membershipAId,
          tenantId: tenantAId,
          userId: userAId,
          status: "ACTIVE",
          updatedAt: new Date(),
        },
        {
          id: membershipBId,
          tenantId: tenantBId,
          userId: userAId,
          status: "ACTIVE",
          updatedAt: new Date(),
        },
        {
          id: membershipInactiveId,
          tenantId: tenantAId,
          userId: userInactiveId,
          status: "INACTIVE",
          updatedAt: new Date(),
        },
      ],
    });

    // 6. Create MembershipRoles
    await prisma.membershipRole.createMany({
      data: [
        {
          tenantId: tenantAId,
          tenantMembershipId: membershipAId,
          roleId: roleAId,
          updatedAt: new Date(),
        },
        {
          tenantId: tenantBId,
          tenantMembershipId: membershipBId,
          roleId: roleBId,
          updatedAt: new Date(),
        },
        {
          tenantId: tenantBId,
          tenantMembershipId: membershipBId,
          roleId: roleBCustomId,
          updatedAt: new Date(),
        },
        {
          tenantId: tenantAId,
          tenantMembershipId: membershipInactiveId,
          roleId: roleAId,
          updatedAt: new Date(),
        },
      ],
    });
  });

  afterAll(async () => {
    await cleanTestData();
  });

  describe("Direct PrismaAuthenticatedMembershipReader Against PostgreSQL", () => {
    it("reads active membership with roles and permissions for User A in Tenant A", async () => {
      const record = await membershipReader.findActiveForUserInTenant(userAId, tenantAId);

      expect(record).not.toBeNull();
      expect(record?.membershipId).toBe(membershipAId);
      expect(record?.tenantId).toBe(tenantAId);
      expect(record?.userId).toBe(userAId);
      expect(record?.roles).toEqual(["TENANT_ADMIN"]);
      expect(record?.permissions).toEqual(
        expect.arrayContaining(["tenant.manage", "vacancy.create"]),
      );
      expect(record?.permissions).toHaveLength(2);
    });

    it("reads active membership with multiple roles for User A in Tenant B using systemKey and custom name fallback", async () => {
      const record = await membershipReader.findActiveForUserInTenant(userAId, tenantBId);

      expect(record).not.toBeNull();
      expect(record?.membershipId).toBe(membershipBId);
      expect(record?.tenantId).toBe(tenantBId);
      expect(record?.userId).toBe(userAId);
      // RECRUITER comes from systemKey, Custom Reviewer falls back to role.name
      expect(record?.roles).toEqual(
        expect.arrayContaining(["RECRUITER", "Custom Reviewer"]),
      );
      expect(record?.roles).toHaveLength(2);
      expect(record?.permissions).toEqual(
        expect.arrayContaining(["candidate.read", "candidate.create", "application.read"]),
      );
      expect(record?.permissions).toHaveLength(3);
    });

    it("returns null for an INACTIVE membership in PostgreSQL", async () => {
      const record = await membershipReader.findActiveForUserInTenant(userInactiveId, tenantAId);
      expect(record).toBeNull();
    });

    it("returns null when user has NO membership in PostgreSQL", async () => {
      const record = await membershipReader.findActiveForUserInTenant(userNoMembershipId, tenantAId);
      expect(record).toBeNull();
    });
  });

  describe("End-to-End AuthenticatedContext Resolution Against PostgreSQL", () => {
    it("resolves Tenant A for User A strictly within Tenant A boundary", async () => {
      const resolver = createAuthenticatedContextResolver({
        resolveActor: async () => currentActorA,
        resolveTenant: publicTenantResolver,
        membershipReader,
      });

      const result = await resolver("iso-tenant-a");

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.tenant.slug).toBe("iso-tenant-a");
        expect(result.value.tenant.name).toBe("Isolation Tenant Alpha");
        expect(result.value.actor.userId).toBe(userAId);
        expect(result.value.membership.membershipId).toBe(membershipAId);
        expect(result.value.roles).toEqual(["TENANT_ADMIN"]);
        expect(result.value.permissions).toEqual(
          expect.arrayContaining(["tenant.manage", "vacancy.create"]),
        );
        // Strict isolation: does NOT contain Tenant B roles or permissions
        expect(result.value.roles).not.toContain("RECRUITER");
        expect(result.value.roles).not.toContain("Custom Reviewer");
        expect(result.value.permissions).not.toContain("candidate.read");
        expect(result.value.permissions).not.toContain("application.read");
      }
    });

    it("resolves Tenant B for User A strictly within Tenant B boundary without union with Tenant A", async () => {
      const resolver = createAuthenticatedContextResolver({
        resolveActor: async () => currentActorA,
        resolveTenant: publicTenantResolver,
        membershipReader,
      });

      const result = await resolver("iso-tenant-b");

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.tenant.slug).toBe("iso-tenant-b");
        expect(result.value.actor.userId).toBe(userAId);
        expect(result.value.membership.membershipId).toBe(membershipBId);
        expect(result.value.roles).toEqual(
          expect.arrayContaining(["RECRUITER", "Custom Reviewer"]),
        );
        expect(result.value.permissions).toEqual(
          expect.arrayContaining(["candidate.read", "candidate.create", "application.read"]),
        );
        // Strict isolation: does NOT contain Tenant A roles or permissions
        expect(result.value.roles).not.toContain("TENANT_ADMIN");
        expect(result.value.permissions).not.toContain("tenant.manage");
        expect(result.value.permissions).not.toContain("vacancy.create");
      }
    });

    it("enforces NotFound (fail-closed) when User A queries Tenant Inactive (even if membership exists or not)", async () => {
      const resolver = createAuthenticatedContextResolver({
        resolveActor: async () => currentActorA,
        resolveTenant: publicTenantResolver,
        membershipReader,
      });

      const result = await resolver("iso-tenant-inactive");

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe("NOT_FOUND");
        expect(result.error.message).toBe("Tenant 'iso-tenant-inactive' not found or inactive.");
      }
    });

    it("enforces NotFound (fail-closed) when user has NO membership in the tenant (no existence leak)", async () => {
      const resolver = createAuthenticatedContextResolver({
        resolveActor: async () => currentActorNoMembership,
        resolveTenant: publicTenantResolver,
        membershipReader,
      });

      const result = await resolver("iso-tenant-a");

      expect(result.ok).toBe(false);
      if (!result.ok) {
        // Section 20 Security Invariant: cross-tenant / missing membership produces NotFound,
        // identical to missing tenant so cross-tenant existence is not revealed.
        expect(result.error.code).toBe("NOT_FOUND");
        expect(result.error.message).toBe("Tenant 'iso-tenant-a' not found or inactive.");
      }
    });

    it("enforces NotFound (fail-closed) when user membership is INACTIVE", async () => {
      const resolver = createAuthenticatedContextResolver({
        resolveActor: async () => currentActorInactive,
        resolveTenant: publicTenantResolver,
        membershipReader,
      });

      const result = await resolver("iso-tenant-a");

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe("NOT_FOUND");
        expect(result.error.message).toBe("Tenant 'iso-tenant-a' not found or inactive.");
      }
    });
  });
});
