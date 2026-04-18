import { CallableRequest, HttpsError } from "firebase-functions/v2/https";
import { db } from "./admin";

export type UserRole = "volunteer" | "ngo" | "admin";

export async function getUserRole(uid: string): Promise<UserRole> {
  const doc = await db.collection("users").doc(uid).get();
  if (!doc.exists) throw new HttpsError("not-found", "User not found");
  return doc.data()!.role as UserRole;
}

export async function assertRole(
  request: CallableRequest,
  ...roles: UserRole[]
): Promise<void> {
  if (!request.auth) throw new HttpsError("unauthenticated", "Must be logged in");
  const role = await getUserRole(request.auth.uid);
  if (!roles.includes(role)) {
    throw new HttpsError("permission-denied", `Requires role: ${roles.join(" or ")}`);
  }
}

export async function assertVerifiedNGO(request: CallableRequest): Promise<void> {
  if (!request.auth) throw new HttpsError("unauthenticated", "Must be logged in");
  const doc = await db.collection("users").doc(request.auth.uid).get();
  const data = doc.data();
  if (!data || data.role !== "ngo") {
    throw new HttpsError("permission-denied", "NGO role required");
  }
  if (!data.ngoVerified) {
    throw new HttpsError("permission-denied", "NGO account not yet verified by admin");
  }
}
