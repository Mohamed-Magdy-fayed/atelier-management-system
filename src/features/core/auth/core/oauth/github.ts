import { z } from "zod";
import { env } from "@/env/server";
import { OAuthClient } from "./base";

export function createGithubOAuthClient() {
	if (!env.GITHUB_CLIENT_ID || !env.GITHUB_CLIENT_SECRET) {
		throw new Error("GitHub OAuth is not configured");
	}

	return new OAuthClient({
		provider: "github",
		clientId: env.GITHUB_CLIENT_ID,
		clientSecret: env.GITHUB_CLIENT_SECRET,
		scopes: ["read:user", "user:email"],
		urls: {
			auth: "https://github.com/login/oauth/authorize",
			token: "https://github.com/login/oauth/access_token",
			user: "https://api.github.com/user",
		},
		userInfo: {
			schema: z.object({
				id: z.coerce.string(),
				email: z.email().nullable().optional(),
				name: z.string().nullable().optional(),
				login: z.string(),
			}),
			parser: (user) => {
				const email = user.email ?? `${user.name?.toLowerCase().replace(/\s/g, "")}@users.noreply.github.com`;
				if (!email) {
					throw new Error(
						"GitHub did not return an email address. Make your email public or use another provider.",
					);
				}
				return {
					id: user.id,
					email,
					name: user.name ?? user.login,
				};
			},
		},
	});
}
