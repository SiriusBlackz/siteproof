import { eq } from "drizzle-orm";
import { organisations, users } from "@/server/db/schema";
import type { db as dbType } from "@/server/db";

type DB = typeof dbType;

export interface DbUser {
  id: string;
  orgId: string;
  clerkId: string;
  email: string;
  name: string;
  role: string;
}

/**
 * Find the database user record for a Clerk user ID.
 * If no record exists, auto-provision an organisation and user record.
 *
 * This avoids requiring a webhook for local development — on first API
 * call after sign-in, the user + org are created on the fly.
 */
export async function ensureUser(
  db: DB,
  clerkId: string,
  clerkUser: { email: string; name: string; imageUrl?: string }
): Promise<DbUser> {
  // Look up existing user by Clerk ID
  const existing = await db.query.users.findFirst({
    where: eq(users.clerkId, clerkId),
  });

  if (existing) {
    return {
      id: existing.id,
      orgId: existing.orgId,
      clerkId: existing.clerkId,
      email: existing.email,
      name: existing.name,
      role: existing.role,
    };
  }

  // No user found — auto-provision org + user
  const [org] = await db
    .insert(organisations)
    .values({
      name: `${clerkUser.name}'s Organisation`,
    })
    .returning();

  const [user] = await db
    .insert(users)
    .values({
      orgId: org.id,
      clerkId,
      email: clerkUser.email,
      name: clerkUser.name,
      role: "admin",
      avatarUrl: clerkUser.imageUrl ?? null,
    })
    .returning();

  return {
    id: user.id,
    orgId: org.id,
    clerkId: user.clerkId,
    email: user.email,
    name: user.name,
    role: user.role,
  };
}
