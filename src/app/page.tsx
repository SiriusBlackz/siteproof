import { redirect } from "next/navigation";
import { isDemoMode } from "@/lib/demo";
import { cookies } from "next/headers";

export default async function HomePage() {
  if (isDemoMode()) {
    const cookieStore = await cookies();
    if (cookieStore.get("demo_user")?.value) {
      redirect("/projects");
    }
    redirect("/demo");
  }

  // In production, check Clerk auth and redirect accordingly
  const { auth } = await import("@clerk/nextjs/server");
  const { userId } = await auth();

  if (userId) {
    redirect("/projects");
  }

  redirect("/sign-in");
}
