"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { ReactNode } from "react";
import { createClient } from "@/lib/supabase/client";

type SignOutButtonProps = {
  className?: string;
  children: ReactNode;
};

export function SignOutButton({ className, children }: SignOutButtonProps) {
  const router = useRouter();
  const supabase = createClient();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSignOut = async () => {
    setIsSubmitting(true);
    await supabase.auth.signOut();
    router.replace("/auth/login");
    router.refresh();
  };

  return (
    <button
      type="button"
      className={className}
      onClick={handleSignOut}
      disabled={isSubmitting}
    >
      {children}
    </button>
  );
}
