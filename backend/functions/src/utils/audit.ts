import { db, Timestamp } from "./admin";

interface AuditEntry {
  action: string;
  actorId: string;
  targetCollection: string;
  targetId: string;
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
}

export async function writeAuditLog(entry: AuditEntry): Promise<void> {
  await db.collection("audit_logs").add({
    ...entry,
    timestamp: Timestamp.now(),
  });
}
