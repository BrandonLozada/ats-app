import { z } from "zod";

export const magicLinkSchema = z.object({
  email: z.email(),
  name: z.string().optional(),
  callbackURL: z.string().optional(),
  newUserCallbackURL: z.string().optional(),
  errorCallbackURL: z.string().optional(),
  metadata: z.object().optional(),
});

export type MagicLinkInput = z.infer<typeof magicLinkSchema>;
