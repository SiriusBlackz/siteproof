import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { isDemoMode } from "@/lib/demo";

export default async function MobileLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (isDemoMode()) {
    const cookieStore = await cookies();
    if (!cookieStore.get("demo_user")?.value) {
      redirect("/demo");
    }
  } else {
    const { auth } = await import("@clerk/nextjs/server");
    const { userId } = await auth();
    if (!userId) redirect("/sign-in");
  }

  return (
    <div className="flex h-[100dvh] flex-col bg-black text-white overflow-hidden">
      {children}
    </div>
  );
}
