"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listNeeds = exports.getNeedById = exports.createNeed = void 0;
const https_1 = require("firebase-functions/v2/https");
const admin_1 = require("../utils/admin");
const rbac_1 = require("../utils/rbac");
const audit_1 = require("../utils/audit");
const geofire_common_1 = require("geofire-common");
const VALID_CATEGORIES = ["medical", "food", "shelter", "education", "logistics", "other"];
// ── Create Need ───────────────────────────────────────────────────────────────
exports.createNeed = (0, https_1.onCall)(async (request) => {
    await (0, rbac_1.assertVerifiedNGO)(request);
    const data = request.data;
    // Validate
    if (!data.title || data.title.length < 5 || data.title.length > 200) {
        throw new https_1.HttpsError("invalid-argument", "title must be 5-200 chars");
    }
    if (!VALID_CATEGORIES.includes(data.category)) {
        throw new https_1.HttpsError("invalid-argument", "Invalid category");
    }
    if (typeof data.urgency !== "number" || data.urgency < 1 || data.urgency > 5) {
        throw new https_1.HttpsError("invalid-argument", "urgency must be 1-5");
    }
    if (data.volunteersNeeded < 1 || data.volunteersNeeded > 100) {
        throw new https_1.HttpsError("invalid-argument", "volunteersNeeded must be 1-100");
    }
    const geohash = (0, geofire_common_1.geohashForLocation)([data.location.lat, data.location.lng]);
    const now = admin_1.Timestamp.now();
    const needRef = admin_1.db.collection("needs").doc();
    const need = {
        id: needRef.id,
        ngoId: request.auth.uid,
        title: data.title,
        description: data.description ?? "",
        category: data.category,
        urgency: data.urgency,
        requiredSkills: data.requiredSkills ?? [],
        location: { ...data.location, geohash },
        volunteersNeeded: data.volunteersNeeded,
        volunteersAssigned: 0,
        status: "open",
        expiresAt: data.expiresAt ? admin_1.Timestamp.fromDate(new Date(data.expiresAt)) : null,
        createdAt: now,
        updatedAt: now,
    };
    await needRef.set(need);
    await (0, audit_1.writeAuditLog)({
        action: "createNeed",
        actorId: request.auth.uid,
        targetCollection: "needs",
        targetId: needRef.id,
        after: need,
    });
    return { success: true, needId: needRef.id };
});
// ── Get Need By ID ────────────────────────────────────────────────────────────
exports.getNeedById = (0, https_1.onCall)(async (request) => {
    if (!request.auth)
        throw new https_1.HttpsError("unauthenticated", "Must be logged in");
    const { needId } = request.data;
    const doc = await admin_1.db.collection("needs").doc(needId).get();
    if (!doc.exists)
        throw new https_1.HttpsError("not-found", "Need not found");
    return doc.data();
});
// ── List Needs ────────────────────────────────────────────────────────────────
exports.listNeeds = (0, https_1.onCall)(async (request) => {
    if (!request.auth)
        throw new https_1.HttpsError("unauthenticated", "Must be logged in");
    const { status = "open", limit = 20, category } = request.data;
    let query = admin_1.db.collection("needs").where("status", "==", status).orderBy("urgency", "desc").orderBy("createdAt", "desc").limit(Math.min(limit, 50));
    if (category) {
        query = query.where("category", "==", category);
    }
    const snap = await query.get();
    return snap.docs.map((d) => d.data());
});
//# sourceMappingURL=needFunctions.js.map