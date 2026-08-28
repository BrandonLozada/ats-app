// Branch options query
import { PrismaService } from "@/infrastructure/database/prisma.service";

export async function getBranchOptionsList() {
  const prisma = PrismaService.client;

  // TODO: Add companyId filter when multi-tenancy is implemented.
  // TODO: Validar qué filtros aplicar para mostrar solo las sucursales relevantes (ej. activas, con vacantes, etc.)
  return await prisma.branch.findMany({
    where: {},
    select: {
      id: true,
      name: true,
    },
    orderBy: {
      name: "asc",
    },
  });
}
