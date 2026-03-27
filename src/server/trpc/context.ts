import { auth, currentUser } from "@clerk/nextjs/server";
import { db } from "@/server/db";
import { ensureUser, type DbUser } from "@/server/services/ensure-user";

export async function createTRPCContext(opts: { headers: Headers }) {
  let clerkId: string | null = null;
  let dbUser: DbUser | null = null;

  try {
    const authResult = await auth();
    clerkId = authResult.userId;
  } catch (e) {
    console.error("[tRPC context] auth() failed:", e);
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
      } else {
        console.warn("[tRPC context] currentUser() returned null for clerkId:", clerkId);
      }
    } catch (e) {
      console.error("[tRPC context] ensureUser failed:", e);
    }
  }

  if (process.env.NODE_ENV === "development") {
    console.log("[tRPC context]", {
      clerkId,
      dbUserId: dbUser?.id ?? null,
      orgId: dbUser?.orgId ?? null,
    });
  }

  return {
    db,
    clerkId,
    userId: dbUser?.id ?? null,
    orgId: dbUser?.orgId ?? null,
    dbUser,
    headers: opts.headers,
  };
}

export type Context = Awaited<ReturnType<typeof createTRPCContext>>;
