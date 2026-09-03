import "server-only";

import { createPublicTenantResolver } from "./application/resolve-public-tenant-context";
import { PrismaPublicTenantReader } from "./infrastructure/prisma-public-tenant-reader";

const prismaPublicTenantReader = new PrismaPublicTenantReader();

export const resolvePublicTenantContext = createPublicTenantResolver(
  prismaPublicTenantReader,
);
