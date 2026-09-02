"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { auth } from "@/modules/identity/public.server";
import { loginSchema } from "@/application/schemas/auth/login.schema";
import { signInSchema } from "@/application/schemas/auth/sign-in.schema";
import { registerSchema } from "@/application/schemas/auth/register-schema";
import { magicLinkSchema } from "@/application/schemas/auth/magic-link.schema";

export async function loginWithPasswordAction(input: unknown) {
  const parsed = loginSchema.parse(input);

  await auth.api.signInEmail({
    body: parsed,
  });

  redirect("/");
}

export async function loginAction(input: unknown) {
  const parsed = loginSchema.parse(input);

  await auth.api.signInEmail({
    body: parsed,
  });

  redirect("/");
}

export async function signInAction(input: unknown) {
  const parsed = signInSchema.parse(input);

  await auth.api.signInEmail({
    body: parsed,
  });

  redirect("/");
}

export async function registerAction(input: unknown) {
  const parsed = registerSchema.parse(input);

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { confirmPassword, ...body } = parsed;

  await auth.api.signUpEmail({
    body: body,
  });
}

export async function sendMagicLinkAction(input: unknown) {
  const parsed = magicLinkSchema.parse(input);

  return await auth.api.signInMagicLink({
    body: parsed,
    // This endpoint requires session cookies.
    headers: await headers(),
  });
}

export async function logOutAction() {
  await auth.api.signOut({
    headers: await headers(),
  });
}
