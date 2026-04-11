import { db } from "@/server/db";
import { resolveCurrentUser, DemoEnsureUserError } from "@/server/services/current-user";

export async function createTRPCContext(opts: { headers: Headers }) {
  let resolved;
  try {
    resolved = await resolveCurrentUser(opts.headers);
  } catch (e) {
    if (e instanceof DemoEnsureUserError) {
      console.error("[tRPC context] demo user resolution failed:", e.cause);
      // Surface a safe error; the tRPC error formatter strips internals.
      throw new Error("Demo session unavailable");
    }
    throw e;
  }

  if (process.env.NODE_ENV === "development") {
    console.log("[tRPC context]", {
      clerkId: resolved.clerkId,
      dbUserId: resolved.userId,
      orgId: resolved.orgId,
    });
  }

  return {
    db,
    clerkId: resolved.clerkId,
    userId: resolved.userId,
    orgId: resolved.orgId,
    dbUser: resolved.dbUser,
    headers: opts.headers,
  };
}

export type Context = Awaited<ReturnType<typeof createTRPCContext>>;
