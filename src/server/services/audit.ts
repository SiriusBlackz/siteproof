import { auditLog } from "@/server/db/schema";
import type { db as dbType } from "@/server/db";

// Accept either the top-level db client or a transaction — both expose .insert.
type DB = typeof dbType;
type Tx = Parameters<Parameters<DB["transaction"]>[0]>[0];
type DBOrTx = DB | Tx;

export type AuditAction =
  | "create"
  | "update"
  | "delete"
  | "archive"
  | "upload"
  | "link"
  | "unlink"
  | "generate"
  | "import"
  | "subscribe"
  | "payment_failed"
  | "cancel_subscription"
  | "bulk_link"
  | "add_member"
  | "remove_member";

export type AuditEntityType =
  | "project"
  | "task"
  | "evidence"
  | "evidence_link"
  | "report"
  | "gps_zone"
  | "subscription"
  | "project_member";

export interface AuditEntry {
  projectId: string;
  userId: string | null;
  action: AuditAction;
  entityType: AuditEntityType;
  entityId: string;
  metadata?: Record<string, unknown>;
}

/**
 * Write an audit log entry. Errors propagate — if you're outside a transaction
 * and want fire-and-forget semantics, use writeAuditLogAsync.
 *
 * Inside a transaction, DO NOT swallow errors: a failed insert aborts the
 * postgres transaction, and silently catching here causes the outer commit
 * to roll back everything without the caller knowing.
 */
export async function writeAuditLog(
  db: DBOrTx,
  entry: AuditEntry
): Promise<void> {
  await db.insert(auditLog).values({
    projectId: entry.projectId,
    userId: entry.userId,
    action: entry.action,
    entityType: entry.entityType,
    entityId: entry.entityId,
    metadata: entry.metadata ?? null,
  });
}

/**
 * Fire-and-forget audit log write for non-transactional callers. Errors are
 * logged and swallowed — use this when an audit failure shouldn't block the
 * user action (e.g. inside a tRPC mutation that already committed its work).
 */
export function writeAuditLogAsync(db: DBOrTx, entry: AuditEntry): void {
  writeAuditLog(db, entry).catch((err) => {
    console.error("[audit] Failed to write audit log:", err);
  });
}
