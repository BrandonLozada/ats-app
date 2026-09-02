import { parseEnv, type ServerEnv } from "./env.schema";

export { envSchema, parseEnv, type ServerEnv } from "./env.schema";

export const env: ServerEnv = parseEnv(process.env);
