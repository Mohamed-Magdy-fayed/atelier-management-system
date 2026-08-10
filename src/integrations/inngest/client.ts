import { Inngest } from "inngest";

import { env } from "@/env/server";

/**
 * The SDK no longer infers dev mode from NODE_ENV: with `INNGEST_DEV` unset it
 * resolves to cloud mode, so a dev machine without an event key throws on the
 * first `send`. Default to dev outside production, and stand aside when
 * `INNGEST_DEV` is set so the SDK can read it — including as a dev server URL.
 */
const isDev = env.INNGEST_DEV ? undefined : env.NODE_ENV !== "production";

export const inngest = new Inngest({
  id: "funtastic",
  isDev,
});
