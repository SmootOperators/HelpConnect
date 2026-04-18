"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteAccount = exports.getStats = exports.verifyNGO = exports.updateUserRole = void 0;
const https_1 = require("firebase-functions/v2/https");
const admin_1 = require("../utils/admin");
const rbac_1 = require("../utils/rbac");
const audit_1 = require("../utils/audit");
// ── Update User Role (Admin only) ────────────────────────────────────────────
exports.updateUserRole = (0, https_1.onCall)(async (request) => {
    await (0, rbac_1.assertRole)(request, "admin");
    const { targetUid, role } = request.data;
    if (!["volunteer", "ngo", "admin"].includes(role)) {
        throw new https_1.HttpsError("invalid-argument", "Invalid role");
    }
    const before = (await admin_1.db.collection("users").doc(targetUid).get()).data();
    await admin_1.db.collection("users").doc(targetUid).update({
        role,
        updatedAt: admin_1.Timestamp.now(),
    });
    await (0, audit_1.writeAuditLog)({
        action: "updateUserRole",
        actorId: request.auth.uid,
        targetCollection: "users",
        targetId: targetUid,
        before: { role: before?.role },
        after: { role },
    });
    return { success: true, uid: targetUid, role };
});
// ── Verify NGO (Admin only) ───────────────────────────────────────────────────
exports.verifyNGO = (0, https_1.onCall)(async (request) => {
    await (0, rbac_1.assertRole)(request, "admin");
    const { ngoUid } = request.data;
    const doc = await admin_1.db.collection("users").doc(ngoUid).get();
    if (!doc.exists)
        throw new https_1.HttpsError("not-found", "User not found");
    if (doc.data()?.role !== "ngo")
        throw new https_1.HttpsError("invalid-argument", "User is not an NGO");
    const verifiedAt = admin_1.Timestamp.now();
    await admin_1.db.collection("users").doc(ngoUid).update({
        ngoVerified: true,
        "ngoProfile.verifiedAt": verifiedAt,
        updatedAt: verifiedAt,
    });
    await (0, audit_1.writeAuditLog)({
        action: "verifyNGO",
        actorId: request.auth.uid,
        targetCollection: "users",
        targetId: ngoUid,
        before: { ngoVerified: false },
        after: { ngoVerified: true },
    });
    return { success: true, verifiedAt: verifiedAt.toDate().toISOString() };
});
// ── Get Platform Stats (Admin only) ──────────────────────────────────────────
exports.getStats = (0, https_1.onCall)(async (request) => {
    await (0, rbac_1.assertRole)(request, "admin");
    const [usersSnap, needsSnap, openNeedsSnap, completedTasksSnap] = await Promise.all([
        admin_1.db.collection("users").count().get(),
        admin_1.db.collection("needs").count().get(),
        admin_1.db.collection("needs").where("status", "==", "open").count().get(),
        admin_1.db.collection("tasks").where("status", "==", "completed").count().get(),
    ]);
    return {
        totalUsers: usersSnap.data().count,
        totalNeeds: needsSnap.data().count,
        openNeeds: openNeedsSnap.data().count,
        completedTasks: completedTasksSnap.data().count,
    };
});
// ── Delete Account (self or admin) ───────────────────────────────────────────
exports.deleteAccount = (0, https_1.onCall)(async (request) => {
    if (!request.auth)
        throw new https_1.HttpsError("unauthenticated", "Must be logged in");
    const targetUid = request.data?.uid ?? request.auth.uid;
    // Only admin can delete others
    if (targetUid !== request.auth.uid) {
        await (0, rbac_1.assertRole)(request, "admin");
    }
    // Delete Firestore data
    const batch = admin_1.db.batch();
    batch.delete(admin_1.db.collection("users").doc(targetUid));
    // Tasks owned by volunteer
    const tasks = await admin_1.db.collection("tasks").where("volunteerId", "==", targetUid).get();
    tasks.forEach((doc) => batch.delete(doc.ref));
    await batch.commit();
    await (0, audit_1.writeAuditLog)({
        action: "deleteAccount",
        actorId: request.auth.uid,
        targetCollection: "users",
        targetId: targetUid,
    });
    return { success: true };
});
//# sourceMappingURL=userFunctions.js.map