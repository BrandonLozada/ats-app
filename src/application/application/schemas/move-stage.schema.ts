import { z } from "zod";

export const moveStageSchema = z.object({
  applicationId: z.uuid(),
  toStageId: z.uuid(),
  notes: z.string().optional(),
});
