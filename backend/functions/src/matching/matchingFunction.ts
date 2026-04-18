import { onCall, HttpsError } from "firebase-functions/v2/https";
import { db } from "../utils/admin";
import { distanceBetween, geohashQueryBounds } from "geofire-common";

/**
 * Volunteer Matching Algorithm
 *
 * Score = 0.40 × skillMatch + 0.30 × (1 - normalizedDistance) + 0.20 × urgencyWeight + 0.10 × loadBalance
 *
 * skillMatch:        fraction of required skills the volunteer has
 * normalizedDistance: capped at 50km, normalized 0–1
 * urgencyWeight:      need.urgency / 5
 * loadBalance:        1 - min(volunteer.activeTaskCount / 5, 1)
 */

interface VolunteerMatch {
  volunteerId: string;
  displayName: string;
  score: number;
  distance: number;
  skillMatch: number;
  activeTaskCount: number;
}

const MAX_DISTANCE_KM = 50;
const WEIGHT = {
  skill: 0.40,
  distance: 0.30,
  urgency: 0.20,
  load: 0.10,
};

function computeScore(params: {
  skillMatch: number;
  distanceKm: number;
  urgency: number;
  activeTaskCount: number;
}): number {
  const normalizedDist = Math.min(params.distanceKm / MAX_DISTANCE_KM, 1);
  const urgencyWeight = params.urgency / 5;
  const loadBalance = 1 - Math.min(params.activeTaskCount / 5, 1);

  return (
    WEIGHT.skill * params.skillMatch +
    WEIGHT.distance * (1 - normalizedDist) +
    WEIGHT.urgency * urgencyWeight +
    WEIGHT.load * loadBalance
  );
}

export const matchVolunteers = onCall(async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "Must be logged in");

  const { needId, limit = 10 } = request.data as { needId: string; limit?: number };

  // Fetch need
  const needDoc = await db.collection("needs").doc(needId).get();
  if (!needDoc.exists) throw new HttpsError("not-found", "Need not found");
  const need = needDoc.data()!;

  const needLocation: [number, number] = [need.location.lat, need.location.lng];
  const requiredSkills: string[] = need.requiredSkills ?? [];
  const urgency: number = need.urgency ?? 3;

  // Geohash query — find volunteers within MAX_DISTANCE_KM
  const bounds = geohashQueryBounds(needLocation, MAX_DISTANCE_KM * 1000);
  const volunteerDocs: FirebaseFirestore.QueryDocumentSnapshot[] = [];

  for (const b of bounds) {
    const snap = await db
      .collection("users")
      .where("role", "==", "volunteer")
      .where("availability", "==", "available")
      .where("location.geohash", ">=", b[0])
      .where("location.geohash", "<=", b[1])
      .get();
    snap.forEach((doc) => volunteerDocs.push(doc));
  }

  // Score each volunteer
  const matches: VolunteerMatch[] = [];

  for (const doc of volunteerDocs) {
    const v = doc.data();
    if (!v.location?.lat || !v.location?.lng) continue;

    const distanceKm = distanceBetween([v.location.lat, v.location.lng], needLocation);
    if (distanceKm > MAX_DISTANCE_KM) continue;

    const vSkills: string[] = v.skills ?? [];
    const skillMatch =
      requiredSkills.length === 0
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
  await db.collection("needs").doc(needId).update({
    topMatches: matches.slice(0, 5).map((m) => m.volunteerId),
    matchingStatus: "completed",
    matchedAt: new Date(),
  });

  return { matches: matches.slice(0, limit) };
});
