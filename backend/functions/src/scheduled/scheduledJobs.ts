import { onSchedule } from "firebase-functions/v2/scheduler";
import { db, Timestamp } from "../utils/admin";

/**
 * Daily at 02:00 UTC: Archive completed tasks older than 90 days
 */
export const scheduledArchive = onSchedule("0 2 * * *", async () => {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 90);
  const cutoffTs = Timestamp.fromDate(cutoff);

  const snap = await db
    .collection("tasks")
    .where("status", "==", "completed")
    .where("completedAt", "<", cutoffTs)
    .limit(500)
    .get();

  const batch = db.batch();
  snap.forEach((doc) => {
    // Move to archive sub-collection
    const archiveRef = db.collection("archive_tasks").doc(doc.id);
    batch.set(archiveRef, { ...doc.data(), archivedAt: Timestamp.now() });
    batch.delete(doc.ref);
  });

  await batch.commit();
  console.log(`[scheduledArchive] Archived ${snap.size} tasks`);
});

/**
 * Daily at 03:00 UTC: Mark expired needs as cancelled
 */
export const scheduledBackup = onSchedule("0 3 * * *", async () => {
  const now = Timestamp.now();
  const snap = await db
    .collection("needs")
    .where("status", "==", "open")
    .where("expiresAt", "<", now)
    .limit(200)
    .get();

  const batch = db.batch();
  snap.forEach((doc) => {
    batch.update(doc.ref, {
      status: "cancelled",
      updatedAt: Timestamp.now(),
    });
  });

  await batch.commit();
  console.log(`[scheduledBackup] Expired ${snap.size} needs`);
});
