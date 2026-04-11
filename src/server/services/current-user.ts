import { db } from "@/server/db";
import { ensureUser, lookupDemoUser, type DbUser } from "@/server/services/ensure-user";
import { isDemoMode, getDemoUser, getDemoUserKeys } from "@/lib/demo";

export type ResolvedUser = {
  clerkId: string | null;
  dbUser: DbUser | null;
  userId: string | null;
  orgId: string | null;
};

export class DemoEnsureUserError extends Error {
  constructor(message: string, public cause?: unknown) {
    super(message);
    this.name = "DemoEnsureUserError";
  }
}

export async function resolveCurrentUser(headers: Headers): Promise<ResolvedUser> {
  let clerkId: string | null = null;
  let dbUser: DbUser | null = null;

  if (isDemoMode()) {
    const cookieHeader = headers.get("cookie") ?? "";
    const match = cookieHeader.match(/demo_user=([^;]+)/);
    const cookieValue = match?.[1] ?? null;
    const validKeys = getDemoUserKeys();
    const safeValue = cookieValue && validKeys.includes(cookieValue) ? cookieValue : null;
    const demoUser = getDemoUser(safeValue);

    // No cookie / unknown cookie → unauthenticated. The /demo picker sets
    // the cookie, so callers that need a session will redirect/401 until
    // the tester has chosen a contractor. Do NOT silently default to one.
    if (!demoUser) {
      return { clerkId: null, dbUser: null, userId: null, orgId: null };
    }

    clerkId = demoUser.clerkId;
    try {
      dbUser = await lookupDemoUser(db, demoUser.clerkId);
    } catch (e: unknown) {
      throw new DemoEnsureUserError("Demo user could not be resolved", e);
    }
  } else {
    const { auth, currentUser } = await import("@clerk/nextjs/server");
    try {
      const authResult = await auth();
      clerkId = authResult.userId;
    } catch (e) {
      console.error("[resolveCurrentUser] auth() failed:", e);
    }

    if (clerkId) {
      try {
        const clerk = await currentUser();
        if (clerk) {
          dbUser = await ensureUser(db, clerkId, {
            email:
              clerk.emailAddresses[0]?.emailAddress ??
              `${clerkId}@siteproof.app`,
            name:
              [clerk.firstName, clerk.lastName].filter(Boolean).join(" ") ||
              (clerk.emailAddresses[0]?.emailAddress ?? "User"),
            imageUrl: clerk.imageUrl,
          });
        }
      } catch (e) {
        console.error("[resolveCurrentUser] ensureUser failed:", e);
      }
    }
  }

  return {
    clerkId,
    dbUser,
    userId: dbUser?.id ?? null,
    orgId: dbUser?.orgId ?? null,
  };
}
