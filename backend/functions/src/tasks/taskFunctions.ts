import { onCall, HttpsError } from "firebase-functions/v2/https";
import { db, Timestamp, FieldValue } from "../utils/admin";
import { assertVerifiedNGO, assertRole, getUserRole } from "../utils/rbac";
import { writeAuditLog } from "../utils/audit";

const VALID_TASK_STATUSES = ["pending", "accepted", "in_progress", "completed", "cancelled"];

// ── Assign Volunteer to a Need ────────────────────────────────────────────────
export const assignVolunteer = onCall(async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "Must be logged in");

  const role = await getUserRole(request.auth.uid);
  if (!["ngo", "admin"].includes(role)) {
    throw new HttpsError("permission-denied", "NGO or Admin role required");
  }

  const { needId, volunteerId, matchScore = 0 } = request.data as {
    needId: string;
    volunteerId: string;
    matchScore?: number;
  };

  // Fetch need
  const needDoc = await db.collection("needs").doc(needId).get();
  if (!needDoc.exists) throw new HttpsError("not-found", "Need not found");
  const need = needDoc.data()!;

  if (need.status !== "open" && need.status !== "in_progress") {
    throw new HttpsError("failed-precondition", "Need is not accepting volunteers");
  }
  if (need.volunteersAssigned >= need.volunteersNeeded) {
    throw new HttpsError("resource-exhausted", "Volunteer slots are full");
  }

  // Check volunteer exists and is a volunteer
  const volDoc = await db.collection("users").doc(volunteerId).get();
  if (!volDoc.exists) throw new HttpsError("not-found", "Volunteer not found");
  if (volDoc.data()?.role !== "volunteer") {
    throw new HttpsError("invalid-argument", "Target user is not a volunteer");
  }

  // Prevent duplicate assignment
  const existing = await db
    .collection("tasks")
    .where("needId", "==", needId)
    .where("volunteerId", "==", volunteerId)
    .where("status", "!=", "cancelled")
    .limit(1)
    .get();
  if (!existing.empty) {
    throw new HttpsError("already-exists", "Volunteer already assigned to this need");
  }

  const now = Timestamp.now();
  const taskRef = db.collection("tasks").doc();
  const task = {
    id: taskRef.id,
    needId,
    volunteerId,
    ngoId: need.ngoId,
    status: "pending",
    matchScore,
    notes: "",
    completedAt: null,
    createdAt: now,
    updatedAt: now,
  };

  const batch = db.batch();
  batch.set(taskRef, task);
  batch.update(db.collection("needs").doc(needId), {
    volunteersAssigned: FieldValue.increment(1),
    status: need.volunteersAssigned + 1 >= need.volunteersNeeded ? "in_progress" : "open",
    updatedAt: now,
  });
  batch.update(db.collection("users").doc(volunteerId), {
    activeTaskCount: FieldValue.increment(1),
    updatedAt: now,
  });
  await batch.commit();

  await writeAuditLog({
    action: "assignVolunteer",
    actorId: request.auth.uid,
    targetCollection: "tasks",
    targetId: taskRef.id,
    after: task,
  });

  return { success: true, taskId: taskRef.id, matchScore };
});

// ── Update Task Status ────────────────────────────────────────────────────────
export const updateTaskStatus = onCall(async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "Must be logged in");

  const { taskId, status, notes = "" } = request.data as {
    taskId: string;
    status: string;
    notes?: string;
  };

  if (!VALID_TASK_STATUSES.includes(status)) {
    throw new HttpsError("invalid-argument", `status must be one of ${VALID_TASK_STATUSES.join(", ")}`);
  }

  const taskDoc = await db.collection("tasks").doc(taskId).get();
  if (!taskDoc.exists) throw new HttpsError("not-found", "Task not found");
  const task = taskDoc.data()!;

  const role = await getUserRole(request.auth.uid);
  const isOwnerVolunteer = role === "volunteer" && task.volunteerId === request.auth.uid;
  const isOwnerNGO = role === "ngo" && task.ngoId === request.auth.uid;
  const isAdmin = role === "admin";

  if (!isOwnerVolunteer && !isOwnerNGO && !isAdmin) {
    throw new HttpsError("permission-denied", "Not authorized to update this task");
  }

  const now = Timestamp.now();
  const updates: Record<string, unknown> = {
    status,
    notes,
    updatedAt: now,
  };

  if (status === "completed") {
    updates.completedAt = now;
    // Decrement activeTaskCount for volunteer
    await db.collection("users").doc(task.volunteerId).update({
      activeTaskCount: FieldValue.increment(-1),
      updatedAt: now,
    });
  }

  const before = { status: task.status };
  await db.collection("tasks").doc(taskId).update(updates);

  await writeAuditLog({
    action: "updateTaskStatus",
    actorId: request.auth.uid,
    targetCollection: "tasks",
    targetId: taskId,
    before,
    after: { status },
  });

  return { success: true };
});

// ── Get My Tasks (volunteer) ──────────────────────────────────────────────────
export const getMyTasks = onCall(async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "Must be logged in");

  const { status } = request.data as { status?: string };
  let query = db
    .collection("tasks")
    .where("volunteerId", "==", request.auth.uid)
    .orderBy("createdAt", "desc")
    .limit(50);

  if (status) {
    query = query.where("status", "==", status) as any;
  }

  const snap = await query.get();
  return snap.docs.map((d) => d.data());
});
