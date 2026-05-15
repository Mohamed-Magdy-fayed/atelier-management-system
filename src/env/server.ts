import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  server: {
    DATABASE_URL: z.string().min(1).optional(),
    DB_PASSWORD: z.string().min(1).optional(),
    DB_USER: z.string().min(1).optional(),
    DB_NAME: z.string().min(1).optional(),
    DB_HOST: z.string().min(1).optional(),
    DB_PORT: z.string().min(1).optional(),

    BASE_URL: z.url(),
    REDIS_URL: z.string().min(1),
    REDIS_TOKEN: z.string().min(1),

    OAUTH_REDIRECT_URL_BASE: z.url(),
    JWT_SECRET_KEY: z.string().min(32),
    GOOGLE_CLIENT_ID: z.string().min(1),
    GOOGLE_CLIENT_SECRET: z.string().min(1),

    WAPILOT_INSTANCE_ID: z.string().min(1),
    WAPILOT_API_TOKEN: z.string().min(1),

    SMTP_HOST: z.string().min(1).optional(),
    SMTP_PORT: z.coerce.number().int().positive().optional(),
    SMTP_USER: z.string().min(1).optional(),
    SMTP_PASSWORD: z.string().min(1).optional(),
    SMTP_SECURE: z.enum(["true", "false"]).optional(),
    SMTP_FROM_EMAIL: z.email().optional(),
    SMTP_FROM_NAME: z.string().min(1).optional(),

    NODE_ENV: z
      .enum(["development", "test", "production"])
      .default("development"),
  },
  createFinalSchema: (env) => {
    return z
      .object(env)
      .superRefine((val, ctx) => {
        const hasDatabaseUrl = Boolean(val.DATABASE_URL);
        const hasSplitDatabaseConfig = Boolean(
          val.DB_HOST &&
            val.DB_NAME &&
            val.DB_PASSWORD &&
            val.DB_PORT &&
            val.DB_USER,
        );

        if (!hasDatabaseUrl && !hasSplitDatabaseConfig) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message:
              "Provide either DATABASE_URL or the full DB_HOST/DB_NAME/DB_PASSWORD/DB_PORT/DB_USER configuration.",
            path: ["DATABASE_URL"],
          });
        }
      })
      .transform((val) => {
        const {
          DATABASE_URL,
          DB_HOST,
          DB_NAME,
          DB_PASSWORD,
          DB_PORT,
          DB_USER,
          ...rest
        } = val;

        return {
          ...rest,
          DATABASE_URL:
            DATABASE_URL ??
            `postgres://${DB_USER}:${DB_PASSWORD}@${DB_HOST}${DB_PORT}/${DB_NAME}`,
        };
      });
  },
  experimental__runtimeEnv: process.env,
  emptyStringAsUndefined: true,
});
