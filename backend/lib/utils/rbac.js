"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUserRole = getUserRole;
exports.assertRole = assertRole;
exports.assertVerifiedNGO = assertVerifiedNGO;
const https_1 = require("firebase-functions/v2/https");
const admin_1 = require("./admin");
async function getUserRole(uid) {
    const doc = await admin_1.db.collection("users").doc(uid).get();
    if (!doc.exists)
        throw new https_1.HttpsError("not-found", "User not found");
    return doc.data().role;
}
async function assertRole(request, ...roles) {
    if (!request.auth)
        throw new https_1.HttpsError("unauthenticated", "Must be logged in");
    const role = await getUserRole(request.auth.uid);
    if (!roles.includes(role)) {
        throw new https_1.HttpsError("permission-denied", `Requires role: ${roles.join(" or ")}`);
    }
}
async function assertVerifiedNGO(request) {
    if (!request.auth)
        throw new https_1.HttpsError("unauthenticated", "Must be logged in");
    const doc = await admin_1.db.collection("users").doc(request.auth.uid).get();
    const data = doc.data();
    if (!data || data.role !== "ngo") {
        throw new https_1.HttpsError("permission-denied", "NGO role required");
    }
    if (!data.ngoVerified) {
        throw new https_1.HttpsError("permission-denied", "NGO account not yet verified by admin");
    }
}
//# sourceMappingURL=rbac.js.map