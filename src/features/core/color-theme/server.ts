"use server";

import { cookies } from "next/headers";

export type Theme = "light" | "dark";
const storageKey = "funtastic-theme";

export async function getThemeCookie() {
	const cookieStore = await cookies();
	return cookieStore.get(storageKey)?.value as Theme;
}

export async function setThemeCookie(data?: Theme) {
	const cookieStore = await cookies();
	if (!data) {
		cookieStore.delete(storageKey);
		return;
	}
	cookieStore.set(storageKey, data);
}
