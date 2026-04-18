import { onDocumentCreated } from "firebase-functions/v2/firestore";
import * as functions from "firebase-functions/v2/auth";
import { db, Timestamp } from "../utils/admin";

/**
 * Triggered when a new user signs up via Firebase Auth.
 * Creates the initial user document in Firestore.
 */
export const onUserCreated = functions.beforeUserCreated(async (event) => {
  const user = event.data;
  if (!user) return;

  const userDoc = {
    uid: user.uid,
    email: user.email ?? "",
    displayName: user.displayName ?? "",
    photoURL: user.photoURL ?? null,
    role: "volunteer", // default role; admin must elevate
    phone: user.phoneNumber ?? null,
    fcmTokens: [],
    location: null,
    skills: [],
    availability: "available",
    activeTaskCount: 0,
    ngoVerified: false,
    ngoProfile: null,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  };

  await db.collection("users").doc(user.uid).set(userDoc);
  console.log(`[onUserCreated] Created user doc for ${user.uid}`);
});
