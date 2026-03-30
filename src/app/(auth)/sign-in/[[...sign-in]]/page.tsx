import { redirect } from "next/navigation";
import { isDemoMode } from "@/lib/demo";

export default async function SignInPage() {
  if (isDemoMode()) {
    redirect("/demo");
  }

  const { SignIn } = await import("@clerk/nextjs");

  return (
    <div className="flex min-h-screen items-center justify-center">
      <SignIn />
    </div>
  );
}
