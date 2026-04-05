"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  magicLinkSchema,
  MagicLinkInput,
} from "@/application/schemas/auth/magic-link.schema";
import { sendMagicLinkAction } from "@/interfaces/http/actions/auth.actions";
import { useTransition } from "react";

export function MagicLinkForm() {
  const [pending, startTransition] = useTransition();

  const form = useForm<MagicLinkInput>({
    resolver: zodResolver(magicLinkSchema),
  });

  const onSubmit = (data: MagicLinkInput) => {
    startTransition(async () => {
      await sendMagicLinkAction(data);
    });
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)}>
      <input placeholder="Email" {...form.register("email")} />

      <button disabled={pending}>
        {pending ? "Enviando..." : "Enviar Magic Link"}
      </button>
    </form>
  );
}
