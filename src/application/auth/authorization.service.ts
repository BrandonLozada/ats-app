import { PrismaService } from "@/infrastructure/database/prisma.service";

export const AuthorizationService = {
  async getUserPermissions(userId: string): Promise<string[]> {
    const prisma = PrismaService.client;

    const roles = await prisma.userRole.findMany({
      where: { userId },
      include: {
        role: {
          include: {
            permissions: {
              include: { permission: true },
            },
          },
        },
      },
    });

    const permissions = new Set<string>();

    for (const userRole of roles) {
      for (const rp of userRole.role.permissions) {
        permissions.add(rp.permission.name);
      }
    }

    return Array.from(permissions);
  },

  async getUserRoles(userId: string): Promise<string[]> {
    const prisma = PrismaService.client;

    const roles = await prisma.userRole.findMany({
      where: { userId },
      include: {
        role: true,
      },
    });

    return roles.map((ur) => ur.role.name);
  },

  async hasPermission(userId: string, permission: string) {
    const permissions = await this.getUserPermissions(userId);

    return permissions.includes(permission);
  },
};
