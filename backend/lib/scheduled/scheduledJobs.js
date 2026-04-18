"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.scheduledBackup = exports.scheduledArchive = void 0;
const scheduler_1 = require("firebase-functions/v2/scheduler");
const admin_1 = require("../utils/admin");
/**
 * Daily at 02:00 UTC: Archive completed tasks older than 90 days
 */
exports.scheduledArchive = (0, scheduler_1.onSchedule)("0 2 * * *", async () => {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 90);
    const cutoffTs = admin_1.Timestamp.fromDate(cutoff);
    const snap = await admin_1.db
        .collection("tasks")
        .where("status", "==", "completed")
        .where("completedAt", "<", cutoffTs)
        .limit(500)
        .get();
    const batch = admin_1.db.batch();
    snap.forEach((doc) => {
        // Move to archive sub-collection
        const archiveRef = admin_1.db.collection("archive_tasks").doc(doc.id);
        batch.set(archiveRef, { ...doc.data(), archivedAt: admin_1.Timestamp.now() });
        batch.delete(doc.ref);
    });
    await batch.commit();
    console.log(`[scheduledArchive] Archived ${snap.size} tasks`);
});
/**
 * Daily at 03:00 UTC: Mark expired needs as cancelled
 */
exports.scheduledBackup = (0, scheduler_1.onSchedule)("0 3 * * *", async () => {
    const now = admin_1.Timestamp.now();
    const snap = await admin_1.db
        .collection("needs")
        .where("status", "==", "open")
        .where("expiresAt", "<", now)
        .limit(200)
        .get();
    const batch = admin_1.db.batch();
    snap.forEach((doc) => {
        batch.update(doc.ref, {
            status: "cancelled",
            updatedAt: admin_1.Timestamp.now(),
        });
    });
    await batch.commit();
    console.log(`[scheduledBackup] Expired ${snap.size} needs`);
});
//# sourceMappingURL=scheduledJobs.js.map