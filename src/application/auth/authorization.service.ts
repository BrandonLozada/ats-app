import { PrismaService } from "@/infrastructure/database/prisma.service";

export const AuthorizationService = {
  async getUserPermissions(
    userId: string,
    tenantId: string,
  ): Promise<string[]> {
    if (!userId || !tenantId) {
      return [];
    }

    const prisma = PrismaService.client;

    const membership = await prisma.tenantMembership.findUnique({
      where: {
        tenantId_userId: {
          tenantId,
          userId,
        },
      },
      include: {
        membershipRoles: {
          include: {
            role: {
              include: {
                permissions: {
                  include: { permission: true },
                },
              },
            },
          },
        },
      },
    });

    if (!membership || membership.status !== "ACTIVE") {
      return [];
    }

    const permissions = new Set<string>();

    for (const mr of membership.membershipRoles) {
      for (const rp of mr.role.permissions) {
        permissions.add(rp.permission.name);
      }
    }

    return Array.from(permissions);
  },

  async getUserRoles(userId: string, tenantId: string): Promise<string[]> {
    if (!userId || !tenantId) {
      return [];
    }

    const prisma = PrismaService.client;

    const membership = await prisma.tenantMembership.findUnique({
      where: {
        tenantId_userId: {
          tenantId,
          userId,
        },
      },
      include: {
        membershipRoles: {
          include: {
            role: true,
          },
        },
      },
    });

    if (!membership || membership.status !== "ACTIVE") {
      return [];
    }

    const roles = new Set<string>();
    for (const mr of membership.membershipRoles) {
      roles.add(mr.role.name);
      if (mr.role.systemKey) {
        roles.add(mr.role.systemKey);
      }
    }

    return Array.from(roles);
  },

  async hasPermission(
    userId: string,
    tenantId: string,
    permission: string,
  ): Promise<boolean> {
    if (!userId || !tenantId || !permission) {
      return false;
    }

    const permissions = await this.getUserPermissions(userId, tenantId);

    return permissions.includes(permission);
  },
};
