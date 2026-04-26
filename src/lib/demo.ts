/**
 * Demo mode — bypass Clerk auth for beta contractor testing.
 * Toggle via DEMO_MODE=true environment variable.
 */

export function isDemoMode(): boolean {
  if (
    process.env.DEMO_MODE === "true" &&
    process.env.NODE_ENV === "production"
  ) {
    console.error(
      "[SECURITY] DEMO_MODE=true is blocked in production. Ignoring."
    );
    return false;
  }
  return process.env.DEMO_MODE === "true";
}

export interface DemoUser {
  clerkId: string;
  email: string;
  name: string;
}

const DEMO_USERS: Record<string, DemoUser> = {
  "contractor-1": {
    clerkId: "demo_clerk_contractor1",
    email: "contractor1@demo.sitefile.app",
    name: "Demo Contractor 1",
  },
  "contractor-2": {
    clerkId: "demo_clerk_contractor2",
    email: "contractor2@demo.sitefile.app",
    name: "Demo Contractor 2",
  },
};

/**
 * Resolve a demo user from a cookie value. Returns null if the cookie is
 * missing or unknown — callers should surface that as "not signed in"
 * rather than silently picking a default contractor, otherwise anyone
 * who knows a URL gets an implicit session.
 */
export function getDemoUser(cookieValue?: string | null): DemoUser | null {
  if (cookieValue && DEMO_USERS[cookieValue]) {
    return DEMO_USERS[cookieValue];
  }
  return null;
}

export function getDemoUserKeys(): string[] {
  return Object.keys(DEMO_USERS);
}

export function getDemoUserByKey(key: string): DemoUser | undefined {
  return DEMO_USERS[key];
}
