import postgres from "postgres";

import type { MigrationEnv } from "./config";

export type MigrationSql = postgres.Sql;

export function createLegacySql(env: MigrationEnv): MigrationSql {
  return postgres(env.LEGACY_DATABASE_URL, {
    max: 1,
    idle_timeout: 20,
    connect_timeout: 30,
  });
}

export function createTargetSql(env: MigrationEnv): MigrationSql {
  return postgres(env.DATABASE_URL, {
    max: 1,
    idle_timeout: 20,
    connect_timeout: 30,
  });
}
