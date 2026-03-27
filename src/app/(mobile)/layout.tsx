import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

export default async function MobileLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  return (
    <div className="flex h-[100dvh] flex-col bg-black text-white overflow-hidden">
      {children}
    </div>
  );
}
