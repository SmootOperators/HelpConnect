"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.onNeedCreated = void 0;
const firestore_1 = require("firebase-functions/v2/firestore");
const admin_1 = require("../utils/admin");
/**
 * When a new Need is created, automatically trigger volunteer matching
 * and notify the NGO that matching has started.
 */
exports.onNeedCreated = (0, firestore_1.onDocumentCreated)("needs/{needId}", async (event) => {
    const need = event.data?.data();
    if (!need)
        return;
    console.log(`[onNeedCreated] Need ${event.params.needId} created — triggering match`);
    // Store a matching_status sub-field to show in UI
    await admin_1.db.collection("needs").doc(event.params.needId).update({
        matchingStatus: "pending",
    });
});
//# sourceMappingURL=needTrigger.js.map