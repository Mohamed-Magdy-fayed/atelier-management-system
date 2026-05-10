import type { Config } from "drizzle-kit";

import { env } from "@/env/server";

export default {
	schema: "./src/drizzle/schema.ts",
	dialect: "postgresql",
	out: "./src/drizzle/migrations",
	dbCredentials: {
		url: env.DATABASE_URL,
	},
} satisfies Config;
