import { redirect } from "next/navigation";
import { isDemoMode } from "@/lib/demo";

export default async function SignUpPage() {
  if (isDemoMode()) {
    redirect("/demo");
  }

  const { SignUp } = await import("@clerk/nextjs");

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-md">
        <SignUp />
      </div>
    </div>
  );
}
