import type { PrismaClient } from "@/generated/prisma/client";
import { prisma } from "./prisma.client";

export const PrismaService: {
  client: PrismaClient;
} = {
  client: prisma,
};
