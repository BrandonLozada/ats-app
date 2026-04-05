import { NextResponse } from "next/server";

import { PrismaService } from "@/infrastructure/database/prisma.service";

export async function GET() {
  const jobs = await PrismaService.client.jobPosting.findMany({
    where: {
      status: "PUBLISHED",
      noIndex: false,
    },
    include: {
      category: true,
      department: true,
      branches: {
        include: { branch: true },
      },
    },
  });

  return NextResponse.json(jobs);
}
