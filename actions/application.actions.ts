"use server"

import { createApplication } from "@/modules/application/application/use-cases/create-application.use-case"
import { createApplicationSchema } from "@/modules/application/application.schema"

// En el action (Server Action) se parsea para mandar respuesta a la UI (Frontend)
export async function createApplicationAction(data: unknown) {
  const parsed = createApplicationSchema.parse(data)

  return createApplication(parsed)
}