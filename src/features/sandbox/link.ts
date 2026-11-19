import { TRPCClientError, type TRPCLink } from "@trpc/client";
import { observable } from "@trpc/server/observable";

import type { AppRouter } from "@/integrations/trpc/routers/_app";

import { runSandboxProcedure } from "./backend";

/** Just long enough for loading states to show; keeps the demo feeling real. */
const LATENCY_MS = 140;

/**
 * Replaces `httpBatchLink` inside the sandbox. Operations never leave the
 * browser: they are answered from the local store in `./state`.
 */
export const sandboxLink: TRPCLink<AppRouter> = () => {
  return ({ op }) =>
    observable((observer) => {
      let cancelled = false;
      const timer = setTimeout(() => {
        if (cancelled) return;
        try {
          const data = runSandboxProcedure(op.path, op.input);
          observer.next({
            result: { type: "data", data },
            context: op.context,
          });
          observer.complete();
        } catch (error) {
          observer.error(
            TRPCClientError.from(
              error instanceof Error ? error : new Error(String(error)),
            ),
          );
        }
      }, LATENCY_MS);

      return () => {
        cancelled = true;
        clearTimeout(timer);
      };
    });
};
