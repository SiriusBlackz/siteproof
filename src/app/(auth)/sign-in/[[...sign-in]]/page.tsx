import { redirect } from "next/navigation";
import { isDemoMode } from "@/lib/demo";

export default async function SignInPage() {
  if (isDemoMode()) {
    redirect("/demo");
  }

  const { SignIn } = await import("@clerk/nextjs");

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-md">
        <SignIn />
      </div>
    </div>
  );
}
