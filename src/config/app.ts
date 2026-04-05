import { env } from "./env";

export const APP_NAME = env.APP_NAME ?? "ATS Empleo";

export const COMPANY_NAME = env.COMPANY_NAME ?? "Empresa";

export const SITE_URL =
  env.SITE_URL?.trim() ||
  (process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : "http://localhost:3000");

export const COMPANY_DOMAIN = env.COMPANY_DOMAIN ?? "empresa.com";

export const EMAIL_DOMAIN = env.EMAIL_DOMAIN ?? "mail.empresa.com";
