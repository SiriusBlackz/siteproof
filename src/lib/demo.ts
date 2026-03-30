/**
 * Demo mode — bypass Clerk auth for beta contractor testing.
 * Toggle via DEMO_MODE=true environment variable.
 */

export function isDemoMode(): boolean {
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
    email: "contractor1@demo.siteproof.app",
    name: "Demo Contractor 1",
  },
  "contractor-2": {
    clerkId: "demo_clerk_contractor2",
    email: "contractor2@demo.siteproof.app",
    name: "Demo Contractor 2",
  },
};

const DEFAULT_DEMO_USER = "contractor-1";

export function getDemoUser(cookieValue?: string | null): DemoUser {
  if (cookieValue && DEMO_USERS[cookieValue]) {
    return DEMO_USERS[cookieValue];
  }
  return DEMO_USERS[DEFAULT_DEMO_USER];
}

export function getDemoUserKeys(): string[] {
  return Object.keys(DEMO_USERS);
}

export function getDemoUserByKey(key: string): DemoUser | undefined {
  return DEMO_USERS[key];
}
