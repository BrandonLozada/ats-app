import { NextRequest, NextResponse } from "next/server";

import { PrismaService } from "@/infrastructure/database/prisma.service";

// Estos endpoint en /api/jobs/* son para que otras apps consuman las vacantes de empleo
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const job = await PrismaService.client.jobPosting.findUniqueOrThrow({
    where: {
      id: params.id,
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

  return NextResponse.json(job);
}
