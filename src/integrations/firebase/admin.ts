import "server-only";

import * as admin from "firebase-admin";
import { env } from "@/env/server";

let app: admin.app.App | undefined;

function getFirebaseAdmin(): admin.app.App {
  if (app) return app;

  if (admin.apps.length > 0) {
    app = admin.apps[0] as admin.app.App;
    return app;
  }

  app = admin.initializeApp({
    credential: admin.credential.cert({
      projectId: env.FIREBASE_PROJECT_ID,
      clientEmail: env.FIREBASE_CLIENT_EMAIL,
      privateKey: env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
    }),
    storageBucket: env.FIREBASE_STORAGE_BUCKET,
  });

  return app;
}

export function getStorageBucket() {
  return getFirebaseAdmin().storage().bucket();
}
