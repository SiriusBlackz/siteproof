import { auditLog } from "@/server/db/schema";
import type { db as dbType } from "@/server/db";

type DB = typeof dbType;

export type AuditAction =
  | "create"
  | "update"
  | "delete"
  | "archive"
  | "upload"
  | "link"
  | "unlink"
  | "generate"
  | "import";

export type AuditEntityType =
  | "project"
  | "task"
  | "evidence"
  | "evidence_link"
  | "report"
  | "gps_zone";

/**
 * Write an audit log entry. Fire-and-forget — errors are logged but don't
 * propagate to the caller.
 */
export async function writeAuditLog(
  db: DB,
  entry: {
    projectId: string;
    userId: string | null;
    action: AuditAction;
    entityType: AuditEntityType;
    entityId: string;
    metadata?: Record<string, unknown>;
  }
): Promise<void> {
  try {
    await db.insert(auditLog).values({
      projectId: entry.projectId,
      userId: entry.userId,
      action: entry.action,
      entityType: entry.entityType,
      entityId: entry.entityId,
      metadata: entry.metadata ?? null,
    });
  } catch (err) {
    console.error("[audit] Failed to write audit log:", err);
  }
}
