"use client";

import { useRouter } from "next/navigation";
import { LogOut, UserRound } from "lucide-react";
import { UserButton, useUser } from "@clerk/nextjs";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const isClerkActive = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);

function DemoUserMenu() {
  const router = useRouter();

  const switchUser = () => {
    document.cookie = "demo_user=; path=/; max-age=0";
    router.push("/demo");
    router.refresh();
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger>
        <span
          className={cn(buttonVariants({ variant: "ghost", size: "icon" }))}
          aria-label="Account menu"
        >
          <UserRound className="h-4 w-4" />
        </span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Demo session</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={switchUser}>
          <LogOut className="mr-2 h-4 w-4" />
          Switch user
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function ClerkUserMenu() {
  const { isLoaded } = useUser();
  if (!isLoaded) return null;
  return (
    <UserButton
      appearance={{
        elements: { avatarBox: "h-8 w-8" },
      }}
    />
  );
}

export function UserMenu() {
  return isClerkActive ? <ClerkUserMenu /> : <DemoUserMenu />;
}
