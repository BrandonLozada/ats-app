import { createApplication } from "@/modules/application/application/use-cases/create-application.use-case";

export async function POST(req: Request) {
  const body = await req.json();

  const result = await createApplication(body);

  return Response.json(result);
}
