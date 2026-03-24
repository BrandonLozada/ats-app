import { PrismaService } from "@/lib/prisma/prisma.service"

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
  })

  console.log(jobs)

  return Response.json(jobs)
}