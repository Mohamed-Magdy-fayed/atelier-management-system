import { eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { db } from "@/drizzle";
import { type User, UsersTable } from "@/features/core/auth/tables/users-table";
import type { PartialUser } from "@/features/core/auth/types";
import { getSessionFromCookie } from "../core/session";

function _getCurrentUser(options: {
	withFullUser: true;
	redirectIfNotFound: true;
}): Promise<User>;
function _getCurrentUser(options: {
	withFullUser: true;
	redirectIfNotFound?: false;
}): Promise<User | null>;
function _getCurrentUser(options: {
	withFullUser?: false;
	redirectIfNotFound: true;
}): Promise<PartialUser>;
function _getCurrentUser(options?: {
	withFullUser?: false;
	redirectIfNotFound?: false;
}): Promise<PartialUser | null>;
async function _getCurrentUser({
	withFullUser = false,
	redirectIfNotFound = false,
} = {}) {
	const cookieStore = await cookies();
	const user = await getSessionFromCookie(cookieStore);
	if (user == null) {
		if (redirectIfNotFound) return redirect("/sign-in");
		return null;
	}

	if (withFullUser) {
		const fullUser = await getUserFromDb(user.id);
		// This should never happen
		if (fullUser == null) throw new Error("User not found in database");
		return fullUser;
	}

	return user;
}

export const getCurrentUser = cache(_getCurrentUser);

async function getUserFromDb(id: string) {
	return db
		.select()
		.from(UsersTable)
		.where(eq(UsersTable.id, id))
		.then((results) => results[0]);
}
