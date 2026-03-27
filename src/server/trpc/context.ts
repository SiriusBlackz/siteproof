import { db } from "@/server/db";

export async function createTRPCContext(opts: { headers: Headers }) {
  // TODO: Replace with Clerk auth when connected
  // const { userId } = await auth();
  return {
    db,
    userId: null as string | null,
    headers: opts.headers,
  };
}

export type Context = Awaited<ReturnType<typeof createTRPCContext>>;
