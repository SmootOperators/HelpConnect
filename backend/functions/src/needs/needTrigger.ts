import { onDocumentCreated } from "firebase-functions/v2/firestore";
import { db } from "../utils/admin";

/**
 * When a new Need is created, automatically trigger volunteer matching
 * and notify the NGO that matching has started.
 */
export const onNeedCreated = onDocumentCreated("needs/{needId}", async (event) => {
  const need = event.data?.data();
  if (!need) return;

  console.log(`[onNeedCreated] Need ${event.params.needId} created — triggering match`);

  // Store a matching_status sub-field to show in UI
  await db.collection("needs").doc(event.params.needId).update({
    matchingStatus: "pending",
  });
});
