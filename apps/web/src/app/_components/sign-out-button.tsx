"use client";

import { createSupabaseBrowserClient } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { useMemo } from "react";

export default function SignOutButton() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const router = useRouter();

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <button
      onClick={handleSignOut}
      className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 border border-gray-300 hover:border-gray-400 rounded-lg transition-colors"
    >
      Sign out
    </button>
  );
}
