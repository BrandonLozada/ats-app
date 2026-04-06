// Job Category options query
import { PrismaService } from "@/infrastructure/database/prisma.service";

export async function getCategoryOptionsList() {
  const prisma = PrismaService.client;

  return await prisma.jobCategory.findMany({
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
