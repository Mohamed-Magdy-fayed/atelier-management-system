import "server-only";

import { type App, cert, getApps, initializeApp } from "firebase-admin/app";
import { getStorage } from "firebase-admin/storage";
import { env } from "@/env/server";

let app: App | undefined;

function getFirebaseAdmin(): App {
  if (app) return app;

  const existing = getApps();
  if (existing.length > 0) {
    app = existing[0] as App;
    return app;
  }

  app = initializeApp({
    credential: cert({
      projectId: env.FIREBASE_PROJECT_ID,
      clientEmail: env.FIREBASE_CLIENT_EMAIL,
      privateKey: env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n").replace(
        /\r/g,
        "",
      ),
    }),
    storageBucket: env.FIREBASE_STORAGE_BUCKET,
  });

  return app;
}

export function getStorageBucket() {
  return getStorage(getFirebaseAdmin()).bucket();
}
