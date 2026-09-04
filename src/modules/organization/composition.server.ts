import "server-only";

import { resolveCurrentActor } from "@/modules/identity/public.server";
import { createPublicTenantResolver } from "./application/resolve-public-tenant-context";
import { createAuthenticatedContextResolver } from "./application/resolve-authenticated-context";
import { PrismaPublicTenantReader } from "./infrastructure/prisma-public-tenant-reader";
import { PrismaAuthenticatedMembershipReader } from "./infrastructure/prisma-authenticated-membership-reader";

const prismaPublicTenantReader = new PrismaPublicTenantReader();
const prismaAuthenticatedMembershipReader =
  new PrismaAuthenticatedMembershipReader();

export const resolvePublicTenantContext = createPublicTenantResolver(
  prismaPublicTenantReader,
);

export const resolveAuthenticatedContext = createAuthenticatedContextResolver({
  resolveActor: resolveCurrentActor,
  resolveTenant: resolvePublicTenantContext,
  membershipReader: prismaAuthenticatedMembershipReader,
});

