"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMyTasks = exports.updateTaskStatus = exports.assignVolunteer = void 0;
const https_1 = require("firebase-functions/v2/https");
const admin_1 = require("../utils/admin");
const rbac_1 = require("../utils/rbac");
const audit_1 = require("../utils/audit");
const VALID_TASK_STATUSES = ["pending", "accepted", "in_progress", "completed", "cancelled"];
// ── Assign Volunteer to a Need ────────────────────────────────────────────────
exports.assignVolunteer = (0, https_1.onCall)(async (request) => {
    if (!request.auth)
        throw new https_1.HttpsError("unauthenticated", "Must be logged in");
    const role = await (0, rbac_1.getUserRole)(request.auth.uid);
    if (!["ngo", "admin"].includes(role)) {
        throw new https_1.HttpsError("permission-denied", "NGO or Admin role required");
    }
    const { needId, volunteerId, matchScore = 0 } = request.data;
    // Fetch need
    const needDoc = await admin_1.db.collection("needs").doc(needId).get();
    if (!needDoc.exists)
        throw new https_1.HttpsError("not-found", "Need not found");
    const need = needDoc.data();
    if (need.status !== "open" && need.status !== "in_progress") {
        throw new https_1.HttpsError("failed-precondition", "Need is not accepting volunteers");
    }
    if (need.volunteersAssigned >= need.volunteersNeeded) {
        throw new https_1.HttpsError("resource-exhausted", "Volunteer slots are full");
    }
    // Check volunteer exists and is a volunteer
    const volDoc = await admin_1.db.collection("users").doc(volunteerId).get();
    if (!volDoc.exists)
        throw new https_1.HttpsError("not-found", "Volunteer not found");
    if (volDoc.data()?.role !== "volunteer") {
        throw new https_1.HttpsError("invalid-argument", "Target user is not a volunteer");
    }
    // Prevent duplicate assignment
    const existing = await admin_1.db
        .collection("tasks")
        .where("needId", "==", needId)
        .where("volunteerId", "==", volunteerId)
        .where("status", "!=", "cancelled")
        .limit(1)
        .get();
    if (!existing.empty) {
        throw new https_1.HttpsError("already-exists", "Volunteer already assigned to this need");
    }
    const now = admin_1.Timestamp.now();
    const taskRef = admin_1.db.collection("tasks").doc();
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
    const batch = admin_1.db.batch();
    batch.set(taskRef, task);
    batch.update(admin_1.db.collection("needs").doc(needId), {
        volunteersAssigned: admin_1.FieldValue.increment(1),
        status: need.volunteersAssigned + 1 >= need.volunteersNeeded ? "in_progress" : "open",
        updatedAt: now,
    });
    batch.update(admin_1.db.collection("users").doc(volunteerId), {
        activeTaskCount: admin_1.FieldValue.increment(1),
        updatedAt: now,
    });
    await batch.commit();
    await (0, audit_1.writeAuditLog)({
        action: "assignVolunteer",
        actorId: request.auth.uid,
        targetCollection: "tasks",
        targetId: taskRef.id,
        after: task,
    });
    return { success: true, taskId: taskRef.id, matchScore };
});
// ── Update Task Status ────────────────────────────────────────────────────────
exports.updateTaskStatus = (0, https_1.onCall)(async (request) => {
    if (!request.auth)
        throw new https_1.HttpsError("unauthenticated", "Must be logged in");
    const { taskId, status, notes = "" } = request.data;
    if (!VALID_TASK_STATUSES.includes(status)) {
        throw new https_1.HttpsError("invalid-argument", `status must be one of ${VALID_TASK_STATUSES.join(", ")}`);
    }
    const taskDoc = await admin_1.db.collection("tasks").doc(taskId).get();
    if (!taskDoc.exists)
        throw new https_1.HttpsError("not-found", "Task not found");
    const task = taskDoc.data();
    const role = await (0, rbac_1.getUserRole)(request.auth.uid);
    const isOwnerVolunteer = role === "volunteer" && task.volunteerId === request.auth.uid;
    const isOwnerNGO = role === "ngo" && task.ngoId === request.auth.uid;
    const isAdmin = role === "admin";
    if (!isOwnerVolunteer && !isOwnerNGO && !isAdmin) {
        throw new https_1.HttpsError("permission-denied", "Not authorized to update this task");
    }
    const now = admin_1.Timestamp.now();
    const updates = {
        status,
        notes,
        updatedAt: now,
    };
    if (status === "completed") {
        updates.completedAt = now;
        // Decrement activeTaskCount for volunteer
        await admin_1.db.collection("users").doc(task.volunteerId).update({
            activeTaskCount: admin_1.FieldValue.increment(-1),
            updatedAt: now,
        });
    }
    const before = { status: task.status };
    await admin_1.db.collection("tasks").doc(taskId).update(updates);
    await (0, audit_1.writeAuditLog)({
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
exports.getMyTasks = (0, https_1.onCall)(async (request) => {
    if (!request.auth)
        throw new https_1.HttpsError("unauthenticated", "Must be logged in");
    const { status } = request.data;
    let query = admin_1.db
        .collection("tasks")
        .where("volunteerId", "==", request.auth.uid)
        .orderBy("createdAt", "desc")
        .limit(50);
    if (status) {
        query = query.where("status", "==", status);
    }
    const snap = await query.get();
    return snap.docs.map((d) => d.data());
});
//# sourceMappingURL=taskFunctions.js.map