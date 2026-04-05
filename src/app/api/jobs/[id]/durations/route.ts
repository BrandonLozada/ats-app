import { NextRequest, NextResponse } from "next/server";

import { ApplicationQuery } from "@/core/application/application.query";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const data = await ApplicationQuery.getStageDurations(params.id);

  return NextResponse.json(data);
}
