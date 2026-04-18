import { onCall, HttpsError } from "firebase-functions/v2/https";
import { db, Timestamp, FieldValue } from "../utils/admin";
import { assertVerifiedNGO, assertRole } from "../utils/rbac";
import { writeAuditLog } from "../utils/audit";
import { geohashForLocation } from "geofire-common";

const VALID_CATEGORIES = ["medical", "food", "shelter", "education", "logistics", "other"];

// ── Create Need ───────────────────────────────────────────────────────────────
export const createNeed = onCall(async (request) => {
  await assertVerifiedNGO(request);

  const data = request.data as {
    title: string;
    description: string;
    category: string;
    urgency: number;
    requiredSkills: string[];
    location: { lat: number; lng: number; address: string };
    volunteersNeeded: number;
    expiresAt: string;
  };

  // Validate
  if (!data.title || data.title.length < 5 || data.title.length > 200) {
    throw new HttpsError("invalid-argument", "title must be 5-200 chars");
  }
  if (!VALID_CATEGORIES.includes(data.category)) {
    throw new HttpsError("invalid-argument", "Invalid category");
  }
  if (typeof data.urgency !== "number" || data.urgency < 1 || data.urgency > 5) {
    throw new HttpsError("invalid-argument", "urgency must be 1-5");
  }
  if (data.volunteersNeeded < 1 || data.volunteersNeeded > 100) {
    throw new HttpsError("invalid-argument", "volunteersNeeded must be 1-100");
  }

  const geohash = geohashForLocation([data.location.lat, data.location.lng]);
  const now = Timestamp.now();

  const needRef = db.collection("needs").doc();
  const need = {
    id: needRef.id,
    ngoId: request.auth!.uid,
    title: data.title,
    description: data.description ?? "",
    category: data.category,
    urgency: data.urgency,
    requiredSkills: data.requiredSkills ?? [],
    location: { ...data.location, geohash },
    volunteersNeeded: data.volunteersNeeded,
    volunteersAssigned: 0,
    status: "open",
    expiresAt: data.expiresAt ? Timestamp.fromDate(new Date(data.expiresAt)) : null,
    createdAt: now,
    updatedAt: now,
  };

  await needRef.set(need);

  await writeAuditLog({
    action: "createNeed",
    actorId: request.auth!.uid,
    targetCollection: "needs",
    targetId: needRef.id,
    after: need,
  });

  return { success: true, needId: needRef.id };
});

// ── Get Need By ID ────────────────────────────────────────────────────────────
export const getNeedById = onCall(async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "Must be logged in");
  const { needId } = request.data as { needId: string };

  const doc = await db.collection("needs").doc(needId).get();
  if (!doc.exists) throw new HttpsError("not-found", "Need not found");

  return doc.data();
});

// ── List Needs ────────────────────────────────────────────────────────────────
export const listNeeds = onCall(async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "Must be logged in");

  const { status = "open", limit = 20, category } = request.data as {
    status?: string;
    limit?: number;
    category?: string;
  };

  let query = db.collection("needs").where("status", "==", status).orderBy("urgency", "desc").orderBy("createdAt", "desc").limit(Math.min(limit, 50));

  if (category) {
    query = query.where("category", "==", category) as any;
  }

  const snap = await query.get();
  return snap.docs.map((d) => d.data());
});
