import { PrismaService } from "@/infrastructure/database/prisma.service";

export async function getDepartmentOptionsList() {
  const prisma = PrismaService.client;

  return await prisma.department.findMany({
    where: {
      isActive: true,
    },
    select: {
      id: true,
      name: true,
    },
    orderBy: {
      name: "asc",
    },
  });
}
