import "server-only";

import { prisma } from "@/infrastructure/database/prisma.client";
import {
  PublicTenantReader,
  PublicTenantRecord,
} from "../application/ports/public-tenant-reader";

export class PrismaPublicTenantReader implements PublicTenantReader {
  async findActiveBySlug(slug: string): Promise<PublicTenantRecord | null> {
    const tenant = await prisma.tenant.findFirst({
      where: {
        slug,
        isActive: true,
      },
      select: {
        id: true,
        slug: true,
        name: true,
      },
    });

    if (!tenant) {
      return null;
    }

    return {
      id: tenant.id,
      slug: tenant.slug,
      name: tenant.name,
    };
  }
}
