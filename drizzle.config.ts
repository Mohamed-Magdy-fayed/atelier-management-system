import type { Config } from "drizzle-kit";

import { env } from "@/env/server";

export default {
	schema: "./src/server/db/schema.ts",
	dialect: "postgresql",
	out: "./src/server/db/migrations",
	dbCredentials: {
		url: env.DATABASE_URL,
	},
} satisfies Config;
