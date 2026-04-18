"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.matchVolunteers = void 0;
const https_1 = require("firebase-functions/v2/https");
const admin_1 = require("../utils/admin");
const geofire_common_1 = require("geofire-common");
const MAX_DISTANCE_KM = 50;
const WEIGHT = {
    skill: 0.40,
    distance: 0.30,
    urgency: 0.20,
    load: 0.10,
};
function computeScore(params) {
    const normalizedDist = Math.min(params.distanceKm / MAX_DISTANCE_KM, 1);
    const urgencyWeight = params.urgency / 5;
    const loadBalance = 1 - Math.min(params.activeTaskCount / 5, 1);
    return (WEIGHT.skill * params.skillMatch +
        WEIGHT.distance * (1 - normalizedDist) +
        WEIGHT.urgency * urgencyWeight +
        WEIGHT.load * loadBalance);
}
exports.matchVolunteers = (0, https_1.onCall)(async (request) => {
    if (!request.auth)
        throw new https_1.HttpsError("unauthenticated", "Must be logged in");
    const { needId, limit = 10 } = request.data;
    // Fetch need
    const needDoc = await admin_1.db.collection("needs").doc(needId).get();
    if (!needDoc.exists)
        throw new https_1.HttpsError("not-found", "Need not found");
    const need = needDoc.data();
    const needLocation = [need.location.lat, need.location.lng];
    const requiredSkills = need.requiredSkills ?? [];
    const urgency = need.urgency ?? 3;
    // Geohash query — find volunteers within MAX_DISTANCE_KM
    const bounds = (0, geofire_common_1.geohashQueryBounds)(needLocation, MAX_DISTANCE_KM * 1000);
    const volunteerDocs = [];
    for (const b of bounds) {
        const snap = await admin_1.db
            .collection("users")
            .where("role", "==", "volunteer")
            .where("availability", "==", "available")
            .where("location.geohash", ">=", b[0])
            .where("location.geohash", "<=", b[1])
            .get();
        snap.forEach((doc) => volunteerDocs.push(doc));
    }
    // Score each volunteer
    const matches = [];
    for (const doc of volunteerDocs) {
        const v = doc.data();
        if (!v.location?.lat || !v.location?.lng)
            continue;
        const distanceKm = (0, geofire_common_1.distanceBetween)([v.location.lat, v.location.lng], needLocation);
        if (distanceKm > MAX_DISTANCE_KM)
            continue;
        const vSkills = v.skills ?? [];
        const skillMatch = requiredSkills.length === 0
            ? 1
            : requiredSkills.filter((s) => vSkills.includes(s)).length / requiredSkills.length;
        const score = computeScore({
            skillMatch,
            distanceKm,
            urgency,
            activeTaskCount: v.activeTaskCount ?? 0,
        });
        matches.push({
            volunteerId: doc.id,
            displayName: v.displayName ?? "",
            score: parseFloat(score.toFixed(4)),
            distance: parseFloat(distanceKm.toFixed(2)),
            skillMatch: parseFloat(skillMatch.toFixed(2)),
            activeTaskCount: v.activeTaskCount ?? 0,
        });
    }
    // Sort by score descending
    matches.sort((a, b) => b.score - a.score);
    // Update need with top matches for display
    await admin_1.db.collection("needs").doc(needId).update({
        topMatches: matches.slice(0, 5).map((m) => m.volunteerId),
        matchingStatus: "completed",
        matchedAt: new Date(),
    });
    return { matches: matches.slice(0, limit) };
});
//# sourceMappingURL=matchingFunction.js.map