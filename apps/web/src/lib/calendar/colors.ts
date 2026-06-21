import type { CalendarFeedEvent } from "@job-tracker/shared";

// ── Hue assignments (edit here to retheme) ──────────────────────────────────
// ROUNDS (purple family): screening/technical-phone → violet | take-home/coding → purple
// pair-programming → purple (darker) | technical-deep-dive/system-design → indigo
// behavioral/panel → fuchsia | final → purple (darkest) | other → slate (neutral)
// deadline → rose | applied → emerald
// manual: slate, blue, amber, teal, pink, cyan, orange, lime
// ────────────────────────────────────────────────────────────────────────────

type ColorVariant = "pill" | "dot" | "card";

// Full literal class strings — must be complete so Tailwind JIT keeps them.
const TOKEN_CLASSES: Record<string, Record<ColorVariant, string>> = {
  "round:screening":           { pill: "bg-violet-100 text-violet-700",    dot: "bg-violet-400",    card: "bg-violet-50 border border-violet-200 text-violet-800"    },
  "round:technical-phone":     { pill: "bg-violet-200 text-violet-800",    dot: "bg-violet-500",    card: "bg-violet-50 border border-violet-300 text-violet-900"    },
  "round:take-home":           { pill: "bg-purple-100 text-purple-700",    dot: "bg-purple-400",    card: "bg-purple-50 border border-purple-200 text-purple-800"    },
  "round:coding":              { pill: "bg-purple-200 text-purple-800",    dot: "bg-purple-500",    card: "bg-purple-50 border border-purple-300 text-purple-900"    },
  "round:pair-programming":    { pill: "bg-purple-300 text-purple-900",    dot: "bg-purple-600",    card: "bg-purple-100 border border-purple-300 text-purple-900"   },
  "round:technical-deep-dive": { pill: "bg-indigo-100 text-indigo-700",    dot: "bg-indigo-500",    card: "bg-indigo-50 border border-indigo-200 text-indigo-800"    },
  "round:system-design":       { pill: "bg-indigo-200 text-indigo-800",    dot: "bg-indigo-600",    card: "bg-indigo-50 border border-indigo-300 text-indigo-900"    },
  "round:behavioral":          { pill: "bg-fuchsia-100 text-fuchsia-700",  dot: "bg-fuchsia-500",   card: "bg-fuchsia-50 border border-fuchsia-200 text-fuchsia-800" },
  "round:panel":               { pill: "bg-fuchsia-200 text-fuchsia-800",  dot: "bg-fuchsia-600",   card: "bg-fuchsia-50 border border-fuchsia-300 text-fuchsia-900" },
  "round:final":               { pill: "bg-purple-400 text-purple-950",    dot: "bg-purple-700",    card: "bg-purple-100 border border-purple-400 text-purple-950"   },
  "round:other":               { pill: "bg-slate-100 text-slate-700",      dot: "bg-slate-500",     card: "bg-slate-50 border border-slate-200 text-slate-800"       },
  "deadline":                  { pill: "bg-rose-100 text-rose-700",        dot: "bg-rose-500",      card: "bg-rose-50 border border-rose-200 text-rose-800"          },
  "applied":                   { pill: "bg-emerald-100 text-emerald-700",  dot: "bg-emerald-500",   card: "bg-emerald-50 border border-emerald-200 text-emerald-800" },
  "manual:slate":              { pill: "bg-slate-100 text-slate-700",      dot: "bg-slate-500",     card: "bg-slate-50 border border-slate-200 text-slate-800"       },
  "manual:blue":               { pill: "bg-blue-100 text-blue-700",        dot: "bg-blue-500",      card: "bg-blue-50 border border-blue-200 text-blue-800"          },
  "manual:amber":              { pill: "bg-amber-100 text-amber-700",      dot: "bg-amber-500",     card: "bg-amber-50 border border-amber-200 text-amber-800"       },
  "manual:teal":               { pill: "bg-teal-100 text-teal-700",        dot: "bg-teal-500",      card: "bg-teal-50 border border-teal-200 text-teal-800"          },
  "manual:pink":               { pill: "bg-pink-100 text-pink-700",        dot: "bg-pink-500",      card: "bg-pink-50 border border-pink-200 text-pink-800"          },
  "manual:cyan":               { pill: "bg-cyan-100 text-cyan-700",        dot: "bg-cyan-500",      card: "bg-cyan-50 border border-cyan-200 text-cyan-800"          },
  "manual:orange":             { pill: "bg-orange-100 text-orange-700",    dot: "bg-orange-500",    card: "bg-orange-50 border border-orange-200 text-orange-800"    },
  "manual:lime":               { pill: "bg-lime-100 text-lime-700",        dot: "bg-lime-500",      card: "bg-lime-50 border border-lime-200 text-lime-800"          },
};

const FALLBACK_CLASSES: Record<ColorVariant, string> = {
  pill: "bg-gray-100 text-gray-700",
  dot:  "bg-gray-400",
  card: "bg-gray-50 border border-gray-200 text-gray-800",
};

/** Resolve the colour token key from a CalendarFeedEvent. */
export function resolveColorKey(event: CalendarFeedEvent): string {
  if (event.source === "interview_round") {
    return `round:${event.roundType ?? "other"}`;
  }
  if (event.source === "deadline") return "deadline";
  if (event.source === "applied")  return "applied";
  // manual: use stored color token if valid, else default
  if (event.color && event.color in TOKEN_CLASSES) return event.color;
  return "manual:slate";
}

/** Get Tailwind classes for a given token and render variant. */
export function colorClasses(tokenKey: string, variant: ColorVariant): string {
  return TOKEN_CLASSES[tokenKey]?.[variant] ?? FALLBACK_CLASSES[variant];
}

/** Colour picker options for Unit 26's manual event form. */
export const MANUAL_COLOR_OPTIONS: { key: string; label: string }[] = [
  { key: "manual:slate",  label: "Default" },
  { key: "manual:blue",   label: "Blue"    },
  { key: "manual:amber",  label: "Amber"   },
  { key: "manual:teal",   label: "Teal"    },
  { key: "manual:pink",   label: "Pink"    },
  { key: "manual:cyan",   label: "Cyan"    },
  { key: "manual:orange", label: "Orange"  },
  { key: "manual:lime",   label: "Lime"    },
];
