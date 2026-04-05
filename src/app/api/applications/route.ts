import { createApplicationUseCase } from "@/application/application/create-application.use-case";

export async function POST(req: Request) {
  const body = await req.json();

  const result = await createApplicationUseCase({
    candidateId: body.candidateId,
    jobPostingId: body.jobPostingId,
    userId: body.userId,
  });

  return Response.json(result);
}
