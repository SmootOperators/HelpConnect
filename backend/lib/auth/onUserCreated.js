"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.onUserCreated = void 0;
const identity_1 = require("firebase-functions/v2/identity");
const admin_1 = require("../utils/admin");
/**
 * Triggered when a new user signs up via Firebase Auth.
 * Creates the initial user document in Firestore.
 */
exports.onUserCreated = (0, identity_1.beforeUserCreated)(async (event) => {
    const user = event.data;
    if (!user)
        return;
    const userDoc = {
        uid: user.uid,
        email: user.email ?? "",
        displayName: user.displayName ?? "",
        photoURL: user.photoURL ?? null,
        role: "volunteer", // default role; admin must elevate
        phone: user.phoneNumber ?? null,
        fcmTokens: [],
        location: null,
        skills: [],
        availability: "available",
        activeTaskCount: 0,
        ngoVerified: false,
        ngoProfile: null,
        createdAt: admin_1.Timestamp.now(),
        updatedAt: admin_1.Timestamp.now(),
    };
    await admin_1.db.collection("users").doc(user.uid).set(userDoc);
    console.log(`[onUserCreated] Created user doc for ${user.uid}`);
});
//# sourceMappingURL=onUserCreated.js.map