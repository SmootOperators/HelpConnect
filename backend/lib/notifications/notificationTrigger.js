"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.onTaskWrite = void 0;
const firestore_1 = require("firebase-functions/v2/firestore");
const admin_1 = require("../utils/admin");
async function sendToUser(uid, payload) {
    const userDoc = await admin_1.db.collection("users").doc(uid).get();
    const fcmTokens = userDoc.data()?.fcmTokens ?? [];
    if (fcmTokens.length === 0) {
        console.log(`[FCM] No tokens for user ${uid}`);
        return;
    }
    const message = {
        notification: { title: payload.title, body: payload.body },
        data: payload.data ?? {},
        tokens: fcmTokens,
    };
    const response = await admin_1.messaging.sendEachForMulticast(message);
    // Clean up invalid tokens
    const invalidTokens = [];
    response.responses.forEach((resp, idx) => {
        if (!resp.success && resp.error?.code === "messaging/registration-token-not-registered") {
            invalidTokens.push(fcmTokens[idx]);
        }
    });
    if (invalidTokens.length > 0) {
        const cleanedTokens = fcmTokens.filter((t) => !invalidTokens.includes(t));
        await admin_1.db.collection("users").doc(uid).update({ fcmTokens: cleanedTokens });
    }
    console.log(`[FCM] Sent to ${uid}: ${response.successCount} success, ${response.failureCount} fail`);
}
/**
 * Firestore trigger: fires on every task document write.
 * Sends contextual push notifications based on status transition.
 */
exports.onTaskWrite = (0, firestore_1.onDocumentWritten)("tasks/{taskId}", async (event) => {
    const before = event.data?.before?.data();
    const after = event.data?.after?.data();
    if (!after)
        return; // Deleted
    const taskId = event.params.taskId;
    const { volunteerId, ngoId, status, needId } = after;
    // New task created → notify volunteer
    if (!before && after) {
        await sendToUser(volunteerId, {
            title: "🤝 New Task Assignment",
            body: "You've been matched to a volunteer opportunity! Tap to view.",
            data: { taskId, needId, type: "task_assigned" },
        });
        return;
    }
    if (!before || before.status === after.status)
        return;
    // Status transitions
    switch (status) {
        case "accepted":
            await sendToUser(ngoId, {
                title: "✅ Volunteer Accepted",
                body: "A volunteer has accepted your request.",
                data: { taskId, needId, volunteerId, type: "task_accepted" },
            });
            break;
        case "in_progress":
            await sendToUser(ngoId, {
                title: "🚀 Task In Progress",
                body: "Your volunteer is now working on the task.",
                data: { taskId, needId, type: "task_in_progress" },
            });
            break;
        case "completed":
            await sendToUser(ngoId, {
                title: "🎉 Task Completed",
                body: "A volunteer has completed a task for your need.",
                data: { taskId, needId, type: "task_completed" },
            });
            await sendToUser(volunteerId, {
                title: "⭐ Task Marked Complete",
                body: "Great work! Your contribution has been recorded.",
                data: { taskId, type: "task_completed" },
            });
            break;
        case "cancelled":
            await sendToUser(volunteerId, {
                title: "❌ Task Cancelled",
                body: "The task you were assigned has been cancelled.",
                data: { taskId, type: "task_cancelled" },
            });
            await sendToUser(ngoId, {
                title: "⚠️ Volunteer Cancelled",
                body: "A volunteer has cancelled their task assignment.",
                data: { taskId, volunteerId, type: "task_cancelled" },
            });
            break;
    }
});
//# sourceMappingURL=notificationTrigger.js.map