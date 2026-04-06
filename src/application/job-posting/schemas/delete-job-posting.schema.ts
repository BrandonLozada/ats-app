import { z } from "zod";

export const deleteJobPostingSchema = z.object({
  id: z.uuid(),
});
