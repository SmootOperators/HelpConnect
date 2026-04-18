import { onCall, HttpsError } from "firebase-functions/v2/https";
import { db, FieldValue, Timestamp } from "../utils/admin";
import { assertRole } from "../utils/rbac";
import { writeAuditLog } from "../utils/audit";

// ── Update User Role (Admin only) ────────────────────────────────────────────
export const updateUserRole = onCall(async (request) => {
  await assertRole(request, "admin");
  const { targetUid, role } = request.data as { targetUid: string; role: string };

  if (!["volunteer", "ngo", "admin"].includes(role)) {
    throw new HttpsError("invalid-argument", "Invalid role");
  }

  const before = (await db.collection("users").doc(targetUid).get()).data();
  await db.collection("users").doc(targetUid).update({
    role,
    updatedAt: Timestamp.now(),
  });

  await writeAuditLog({
    action: "updateUserRole",
    actorId: request.auth!.uid,
    targetCollection: "users",
    targetId: targetUid,
    before: { role: before?.role },
    after: { role },
  });

  return { success: true, uid: targetUid, role };
});

// ── Verify NGO (Admin only) ───────────────────────────────────────────────────
export const verifyNGO = onCall(async (request) => {
  await assertRole(request, "admin");
  const { ngoUid } = request.data as { ngoUid: string };

  const doc = await db.collection("users").doc(ngoUid).get();
  if (!doc.exists) throw new HttpsError("not-found", "User not found");
  if (doc.data()?.role !== "ngo") throw new HttpsError("invalid-argument", "User is not an NGO");

  const verifiedAt = Timestamp.now();
  await db.collection("users").doc(ngoUid).update({
    ngoVerified: true,
    "ngoProfile.verifiedAt": verifiedAt,
    updatedAt: verifiedAt,
  });

  await writeAuditLog({
    action: "verifyNGO",
    actorId: request.auth!.uid,
    targetCollection: "users",
    targetId: ngoUid,
    before: { ngoVerified: false },
    after: { ngoVerified: true },
  });

  return { success: true, verifiedAt: verifiedAt.toDate().toISOString() };
});

// ── Get Platform Stats (Admin only) ──────────────────────────────────────────
export const getStats = onCall(async (request) => {
  await assertRole(request, "admin");

  const [usersSnap, needsSnap, openNeedsSnap, completedTasksSnap] = await Promise.all([
    db.collection("users").count().get(),
    db.collection("needs").count().get(),
    db.collection("needs").where("status", "==", "open").count().get(),
    db.collection("tasks").where("status", "==", "completed").count().get(),
  ]);

  return {
    totalUsers: usersSnap.data().count,
    totalNeeds: needsSnap.data().count,
    openNeeds: openNeedsSnap.data().count,
    completedTasks: completedTasksSnap.data().count,
  };
});

// ── Delete Account (self or admin) ───────────────────────────────────────────
export const deleteAccount = onCall(async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "Must be logged in");
  const targetUid = (request.data as { uid?: string })?.uid ?? request.auth.uid;

  // Only admin can delete others
  if (targetUid !== request.auth.uid) {
    await assertRole(request, "admin");
  }

  // Delete Firestore data
  const batch = db.batch();
  batch.delete(db.collection("users").doc(targetUid));

  // Tasks owned by volunteer
  const tasks = await db.collection("tasks").where("volunteerId", "==", targetUid).get();
  tasks.forEach((doc) => batch.delete(doc.ref));

  await batch.commit();

  await writeAuditLog({
    action: "deleteAccount",
    actorId: request.auth.uid,
    targetCollection: "users",
    targetId: targetUid,
  });

  return { success: true };
});
