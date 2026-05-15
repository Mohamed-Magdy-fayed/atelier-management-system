import { z } from "zod";

export const MIGRATION_ACTOR = "legacy-migration";

export const migrationEnvSchema = z.object({
  DATABASE_URL: z.string().min(1),
  LEGACY_DATABASE_URL: z.string().min(1),
});

export type MigrationEnv = z.infer<typeof migrationEnvSchema>;

export type MigrationCliOptions = {
  dryRun: boolean;
  fresh: boolean;
  only: string[] | null;
  verify: boolean;
};

export function parseCliOptions(argv: string[]): MigrationCliOptions {
  return {
    dryRun: argv.includes("--dry-run"),
    fresh: argv.includes("--fresh"),
    only: (() => {
      const onlyArg = argv.find((a) => a.startsWith("--only="));
      if (!onlyArg) return null;
      return onlyArg
        .slice("--only=".length)
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
    })(),
    verify: !argv.includes("--no-verify"),
  };
}

export function loadMigrationEnv(): MigrationEnv {
  const parsed = migrationEnvSchema.safeParse(process.env);
  if (!parsed.success) {
    console.error(
      "Missing or invalid env. Set DATABASE_URL and LEGACY_DATABASE_URL.",
    );
    console.error(parsed.error.flatten().fieldErrors);
    process.exit(1);
  }
  return parsed.data;
}
