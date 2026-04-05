import { createAppContext } from "@/infrastructure/auth/create-context";
import { requireAuth, requirePermission } from "@/application/auth/guards";

export async function createApplicationUseCase(input: {
  jobPostingId: string;
}) {
  const ctx = await createAppContext();

  // Seguridad
  requireAuth(ctx);

  // Permiso
  requirePermission(ctx, "create:application");

  // lógica
  const userId = ctx.userId;

  // Aquí ya puedes usar userId seguro
  console.log("userId: ", userId);

  console.log("input: ", input);
}
