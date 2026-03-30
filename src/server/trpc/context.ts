import { db } from "@/server/db";
import { ensureUser, type DbUser } from "@/server/services/ensure-user";
import { isDemoMode, getDemoUser } from "@/lib/demo";

export async function createTRPCContext(opts: { headers: Headers }) {
  let clerkId: string | null = null;
  let dbUser: DbUser | null = null;

  if (isDemoMode()) {
    // Demo mode: read identity from cookie, bypass Clerk entirely
    const cookieHeader = opts.headers.get("cookie") ?? "";
    const match = cookieHeader.match(/demo_user=([^;]+)/);
    const demoUser = getDemoUser(match?.[1] ?? null);
    clerkId = demoUser.clerkId;

    try {
      dbUser = await ensureUser(db, demoUser.clerkId, {
        email: demoUser.email,
        name: demoUser.name,
      });
    } catch (e: any) {
      const errMsg = e?.message ?? "unknown error";
      const cause = e?.cause?.message ?? e?.code ?? "";
      throw new Error(`Demo ensureUser failed: ${errMsg} | cause: ${cause} | stack: ${e?.stack?.split("\n").slice(0, 3).join(" ")}`);
    }
  } else {
    const { auth, currentUser } = await import("@clerk/nextjs/server");

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
