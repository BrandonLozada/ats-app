// Hiring Pipeline options query
import { PrismaService } from "@/infrastructure/database/prisma.service";

export async function getPipelineOptionsList() {
  const prisma = PrismaService.client;

  return await prisma.hiringPipeline.findMany({
    select: {
      id: true,
      name: true,
      isDefault: true,
    },
    orderBy: [{ isDefault: "desc" }, { name: "asc" }],
  });
}
