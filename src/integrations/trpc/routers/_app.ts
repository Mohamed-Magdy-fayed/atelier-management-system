import { randomUUID } from "node:crypto";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { LOCALE_COOKIE_NAME } from "@/features/core/i18n/lib";
import { baseProcedure, createTRPCRouter } from "../init";
import { branchesRouter } from "./branches";
import { usersRouter } from "./users";

const MAX_IMAGE_BYTES = 4 * 1024 * 1024;
const ALLOWED_IMAGE_MIME_TYPES = new Set([
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/gif",
    "image/avif",
]);

const EXTENSION_BY_MIME_TYPE: Record<string, string> = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
    "image/gif": ".gif",
    "image/avif": ".avif",
};

function getPathname(value: string): string {
    try {
        return new URL(value).pathname;
    } catch {
        return value;
    }
}

export const appRouter = createTRPCRouter({
    i18n: {
        toggleLocale: baseProcedure
            .input(z.object({ newLocale: z.string() }))
            .mutation(({ ctx, input: { newLocale } }) => {
                ctx.cookies.set(LOCALE_COOKIE_NAME, newLocale, {
                    path: "/",
                    httpOnly: true,
                    sameSite: "lax",
                });

                return { newLocale };
            }),

        getLocale: baseProcedure.query(({ ctx }) => {
            const currentLocale = ctx.cookies.get(LOCALE_COOKIE_NAME)?.value || "en";
            return { currentLocale };
        }),
    },
    uploadImage: baseProcedure
        .input(
            z.object({
                fileName: z.string().min(1),
                mimeType: z.string().startsWith("image/"),
                base64: z.string().min(1),
                oldUrl: z.string().nullable().optional(),
            }),
        )
        .mutation(async ({ input }) => {
            if (!ALLOWED_IMAGE_MIME_TYPES.has(input.mimeType)) {
                throw new TRPCError({
                    code: "BAD_REQUEST",
                    message: "Unsupported image type",
                });
            }

            const uploadsDir = path.join(
                process.cwd(),
                "public",
                "uploads",
                "images",
            );
            await mkdir(uploadsDir, { recursive: true });

            const extension = EXTENSION_BY_MIME_TYPE[input.mimeType] ?? ".jpg";

            const safeName = `${Date.now()}-${randomUUID()}${extension}`;
            const outputPath = path.join(uploadsDir, safeName);

            const buffer = Buffer.from(input.base64, "base64");
            if (!buffer.length || buffer.length > MAX_IMAGE_BYTES) {
                throw new TRPCError({
                    code: "BAD_REQUEST",
                    message: "Image exceeds the maximum allowed size",
                });
            }

            await writeFile(outputPath, buffer);

            const oldPathname = input.oldUrl ? getPathname(input.oldUrl) : null;
            const shouldDeleteOldFile =
                oldPathname?.startsWith("/uploads/images/") ||
                oldPathname?.startsWith("/images/");

            if (oldPathname && shouldDeleteOldFile) {
                const oldFileName = path.basename(oldPathname.split("?")[0]);
                const oldPath = path.join(uploadsDir, oldFileName);
                const uploadsDirResolved = path.resolve(uploadsDir);
                const oldPathResolved = path.resolve(oldPath);

                if (oldPathResolved.startsWith(`${uploadsDirResolved}${path.sep}`)) {
                    await unlink(oldPathResolved).catch(() => {
                        // Ignore delete failures because replacing the image already succeeded.
                    });
                }
            }

            return {
                url: `/images/${safeName}`,
            };
        }),
    branches: branchesRouter,
    users: usersRouter,
});

export type AppRouter = typeof appRouter;
