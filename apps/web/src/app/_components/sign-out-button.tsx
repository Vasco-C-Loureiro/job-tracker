"use client";

import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase";

export default function SignOutButton({ collapsed = false }: { collapsed?: boolean }) {
  const router = useRouter();

  const handleSignOut = async () => {
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut({ scope: "local" });
    router.push("/login");
    router.refresh();
  };

  if (collapsed) {
    return (
      <div className="relative group/signout">
        <button
          onClick={handleSignOut}
          aria-label="Sign out"
          className="flex items-center justify-center w-full p-2 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
        >
          <LogOut size={18} />
        </button>
        <div className="pointer-events-none absolute left-full top-1/2 -translate-y-1/2 ml-3 z-50 px-2 py-1 rounded bg-gray-900 text-white text-xs whitespace-nowrap opacity-0 group-hover/signout:opacity-100 transition-opacity duration-150">
          Sign out
        </div>
      </div>
    );
  }

  return (
    <button
      onClick={handleSignOut}
      className="flex items-center gap-2 w-full px-2.5 py-2 rounded-md text-sm text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors"
    >
      <LogOut size={18} className="shrink-0" />
      <span>Sign out</span>
    </button>
  );
}
