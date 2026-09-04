import "server-only";

import { prisma } from "@/infrastructure/database/prisma.client";
import type {
  AuthenticatedMembershipReader,
  AuthenticatedMembershipRecord,
} from "../application/ports/authenticated-membership-reader";

export class PrismaAuthenticatedMembershipReader
  implements AuthenticatedMembershipReader
{
  async findActiveForUserInTenant(
    userId: string,
    tenantId: string,
  ): Promise<AuthenticatedMembershipRecord | null> {
    if (!userId || !tenantId) {
      return null;
    }

    const membership = await prisma.tenantMembership.findUnique({
      where: {
        tenantId_userId: {
          tenantId,
          userId,
        },
      },
      select: {
        id: true,
        tenantId: true,
        userId: true,
        status: true,
        membershipRoles: {
          select: {
            role: {
              select: {
                name: true,
                systemKey: true,
                permissions: {
                  select: {
                    permission: {
                      select: {
                        name: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!membership || membership.status !== "ACTIVE") {
      return null;
    }

    const rolesSet = new Set<string>();
    const permissionsSet = new Set<string>();

    for (const mr of membership.membershipRoles) {
      // Role Representation rule: systemKey when present, otherwise role.name
      const roleIdentifier = mr.role.systemKey || mr.role.name;
      if (roleIdentifier) {
        rolesSet.add(roleIdentifier);
      }

      for (const rp of mr.role.permissions) {
        if (rp.permission?.name) {
          permissionsSet.add(rp.permission.name);
        }
      }
    }

    return {
      membershipId: membership.id,
      tenantId: membership.tenantId,
      userId: membership.userId,
      roles: Array.from(rolesSet),
      permissions: Array.from(permissionsSet),
    };
  }
}
