import { PrismaService } from "@/lib/prisma/prisma.service";
import { Prisma } from "@/src/generated/prisma/client";

export const applicationRepository = {
  create(data: Prisma.ApplicationUncheckedCreateInput) {
    return PrismaService.client.application.create({ data });
  },
};
