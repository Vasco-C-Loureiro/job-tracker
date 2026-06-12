"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Briefcase,
  Mail,
  Calendar,
  BarChart2,
  Upload,
  Settings,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import SignOutButton from "@/app/_components/sign-out-button";

type NavItem = {
  href: string;
  icon: React.ElementType;
  label: string;
  disabled?: boolean;
};

const NAV_ITEMS: NavItem[] = [
  { href: "/",           icon: Briefcase, label: "Applications" },
  { href: "/interviews", icon: Mail,      label: "Interviews"   },
  { href: "/import",     icon: Upload,    label: "Import"       },
  { href: "/calendar",   icon: Calendar,  label: "Calendar",  disabled: true },
  { href: "/analytics",  icon: BarChart2, label: "Analytics", disabled: true },
  { href: "/settings",   icon: Settings,  label: "Settings"  },
];

const STORAGE_KEY = "job-tracker-sidebar-expanded";

export function Sidebar() {
  const pathname = usePathname();
  const [expanded, setExpanded] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored !== null) setExpanded(stored === "true");
    setMounted(true);
  }, []);

  const toggle = () => {
    setExpanded((prev) => {
      const next = !prev;
      localStorage.setItem(STORAGE_KEY, String(next));
      return next;
    });
  };

  // Use expanded=true until mounted to match server render and avoid hydration mismatch
  const isExpanded = mounted ? expanded : true;

  return (
    <aside
      style={{ width: isExpanded ? "208px" : "56px" }}
      className="relative flex flex-col h-screen sticky top-0 shrink-0 border-r border-gray-200 bg-white transition-[width] duration-200 ease-in-out overflow-hidden"
    >
      {/* Header / toggle button */}
      <div
        className={`flex items-center h-14 px-3 border-b border-gray-100 shrink-0 ${
          isExpanded ? "justify-between" : "justify-center"
        }`}
      >
        {isExpanded && (
          <span className="text-sm font-semibold text-gray-900 tracking-tight select-none truncate">
            Job Tracker
          </span>
        )}
        <button
          onClick={toggle}
          aria-label={isExpanded ? "Collapse sidebar" : "Expand sidebar"}
          className="p-1.5 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors shrink-0"
        >
          {isExpanded ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
        </button>
      </div>

      {/* Nav items */}
      <nav className="flex-1 flex flex-col gap-0.5 p-2 overflow-y-auto overflow-x-hidden">
        {NAV_ITEMS.map(({ href, icon: Icon, label, disabled }) => {
          const isActive = pathname === href;
          const base = `flex items-center gap-3 px-2.5 py-2 rounded-md text-sm transition-colors ${
            isExpanded ? "" : "justify-center"
          }`;

          return (
            <div key={href} className="relative group/nav">
              {disabled ? (
                <div className={`${base} text-gray-300 cursor-not-allowed select-none`}>
                  <Icon size={18} className="shrink-0" />
                  {isExpanded && <span className="truncate">{label}</span>}
                </div>
              ) : (
                <Link
                  href={href}
                  className={`${base} ${
                    isActive
                      ? "bg-blue-50 text-blue-700 font-medium"
                      : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                  }`}
                >
                  <Icon size={18} className="shrink-0" />
                  {isExpanded && <span className="truncate">{label}</span>}
                </Link>
              )}

              {/* Tooltip shown only when sidebar is collapsed */}
              {!isExpanded && (
                <div className="pointer-events-none absolute left-full top-1/2 -translate-y-1/2 ml-3 z-50 px-2 py-1 rounded bg-gray-900 text-white text-xs whitespace-nowrap opacity-0 group-hover/nav:opacity-100 transition-opacity duration-150">
                  {label}
                  {disabled && <span className="ml-1 text-gray-400">· soon</span>}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* Footer: sign out */}
      <div className="shrink-0 p-2 border-t border-gray-100">
        <SignOutButton collapsed={!isExpanded} />
      </div>
    </aside>
  );
}
