import type { CalendarFeedEvent, InterviewType } from "@job-tracker/shared";

// ── Hue assignments ──────────────────────────────────────────────────────────
// Each InterviewType gets one distinct hue. Within that hue, round number
// drives a 4-step pastel→saturated ramp (step = min(roundNumber, 4)).
// "other" → neutral slate (fixed, no ramp).
// deadline → rose | applied → emerald | manual → pink/purple/lime/yellow/red
// ────────────────────────────────────────────────────────────────────────────

type ColorVariant = "pill" | "dot" | "card";

// One hue per typed InterviewType (excluding "other" — handled separately).
const ROUND_HUES: Partial<Record<InterviewType, string>> = {
  "screening":           "sky",
  "technical-phone":     "cyan",
  "take-home":           "teal",
  "coding":              "indigo",
  "pair-programming":    "green",
  "technical-deep-dive": "blue",
  "system-design":       "violet",
  "behavioral":          "amber",
  "panel":               "orange",
  "final":               "fuchsia",
};

// 4-step ramp — must be literal strings so Tailwind JIT keeps them.
const ROUND_STEP_CLASSES: Record<string, Record<number, Record<ColorVariant, string>>> = {
  sky: {
    1: { pill: "bg-sky-50 text-sky-600",      dot: "bg-sky-300",      card: "bg-sky-50 border border-sky-100 text-sky-700"      },
    2: { pill: "bg-sky-100 text-sky-700",     dot: "bg-sky-400",      card: "bg-sky-50 border border-sky-200 text-sky-800"      },
    3: { pill: "bg-sky-200 text-sky-800",     dot: "bg-sky-500",      card: "bg-sky-100 border border-sky-300 text-sky-900"     },
    4: { pill: "bg-sky-300 text-sky-900",     dot: "bg-sky-600",      card: "bg-sky-100 border border-sky-400 text-sky-950"     },
  },
  cyan: {
    1: { pill: "bg-cyan-50 text-cyan-600",    dot: "bg-cyan-300",     card: "bg-cyan-50 border border-cyan-100 text-cyan-700"   },
    2: { pill: "bg-cyan-100 text-cyan-700",   dot: "bg-cyan-400",     card: "bg-cyan-50 border border-cyan-200 text-cyan-800"   },
    3: { pill: "bg-cyan-200 text-cyan-800",   dot: "bg-cyan-500",     card: "bg-cyan-100 border border-cyan-300 text-cyan-900"  },
    4: { pill: "bg-cyan-300 text-cyan-900",   dot: "bg-cyan-600",     card: "bg-cyan-100 border border-cyan-400 text-cyan-950"  },
  },
  teal: {
    1: { pill: "bg-teal-50 text-teal-600",    dot: "bg-teal-300",     card: "bg-teal-50 border border-teal-100 text-teal-700"   },
    2: { pill: "bg-teal-100 text-teal-700",   dot: "bg-teal-400",     card: "bg-teal-50 border border-teal-200 text-teal-800"   },
    3: { pill: "bg-teal-200 text-teal-800",   dot: "bg-teal-500",     card: "bg-teal-100 border border-teal-300 text-teal-900"  },
    4: { pill: "bg-teal-300 text-teal-900",   dot: "bg-teal-600",     card: "bg-teal-100 border border-teal-400 text-teal-950"  },
  },
  indigo: {
    1: { pill: "bg-indigo-50 text-indigo-600",  dot: "bg-indigo-300",  card: "bg-indigo-50 border border-indigo-100 text-indigo-700"  },
    2: { pill: "bg-indigo-100 text-indigo-700", dot: "bg-indigo-400",  card: "bg-indigo-50 border border-indigo-200 text-indigo-800"  },
    3: { pill: "bg-indigo-200 text-indigo-800", dot: "bg-indigo-500",  card: "bg-indigo-100 border border-indigo-300 text-indigo-900" },
    4: { pill: "bg-indigo-300 text-indigo-900", dot: "bg-indigo-600",  card: "bg-indigo-100 border border-indigo-400 text-indigo-950" },
  },
  green: {
    1: { pill: "bg-green-50 text-green-600",    dot: "bg-green-300",   card: "bg-green-50 border border-green-100 text-green-700"    },
    2: { pill: "bg-green-100 text-green-700",   dot: "bg-green-400",   card: "bg-green-50 border border-green-200 text-green-800"    },
    3: { pill: "bg-green-200 text-green-800",   dot: "bg-green-500",   card: "bg-green-100 border border-green-300 text-green-900"   },
    4: { pill: "bg-green-300 text-green-900",   dot: "bg-green-600",   card: "bg-green-100 border border-green-400 text-green-950"   },
  },
  blue: {
    1: { pill: "bg-blue-50 text-blue-600",      dot: "bg-blue-300",    card: "bg-blue-50 border border-blue-100 text-blue-700"       },
    2: { pill: "bg-blue-100 text-blue-700",     dot: "bg-blue-400",    card: "bg-blue-50 border border-blue-200 text-blue-800"       },
    3: { pill: "bg-blue-200 text-blue-800",     dot: "bg-blue-500",    card: "bg-blue-100 border border-blue-300 text-blue-900"      },
    4: { pill: "bg-blue-300 text-blue-900",     dot: "bg-blue-600",    card: "bg-blue-100 border border-blue-400 text-blue-950"      },
  },
  violet: {
    1: { pill: "bg-violet-50 text-violet-600",   dot: "bg-violet-300",  card: "bg-violet-50 border border-violet-100 text-violet-700"  },
    2: { pill: "bg-violet-100 text-violet-700",  dot: "bg-violet-400",  card: "bg-violet-50 border border-violet-200 text-violet-800"  },
    3: { pill: "bg-violet-200 text-violet-800",  dot: "bg-violet-500",  card: "bg-violet-100 border border-violet-300 text-violet-900" },
    4: { pill: "bg-violet-300 text-violet-900",  dot: "bg-violet-600",  card: "bg-violet-100 border border-violet-400 text-violet-950" },
  },
  amber: {
    1: { pill: "bg-amber-50 text-amber-600",     dot: "bg-amber-300",   card: "bg-amber-50 border border-amber-100 text-amber-700"    },
    2: { pill: "bg-amber-100 text-amber-700",    dot: "bg-amber-400",   card: "bg-amber-50 border border-amber-200 text-amber-800"    },
    3: { pill: "bg-amber-200 text-amber-800",    dot: "bg-amber-500",   card: "bg-amber-100 border border-amber-300 text-amber-900"   },
    4: { pill: "bg-amber-300 text-amber-900",    dot: "bg-amber-600",   card: "bg-amber-100 border border-amber-400 text-amber-950"   },
  },
  orange: {
    1: { pill: "bg-orange-50 text-orange-600",   dot: "bg-orange-300",  card: "bg-orange-50 border border-orange-100 text-orange-700"  },
    2: { pill: "bg-orange-100 text-orange-700",  dot: "bg-orange-400",  card: "bg-orange-50 border border-orange-200 text-orange-800"  },
    3: { pill: "bg-orange-200 text-orange-800",  dot: "bg-orange-500",  card: "bg-orange-100 border border-orange-300 text-orange-900" },
    4: { pill: "bg-orange-300 text-orange-900",  dot: "bg-orange-600",  card: "bg-orange-100 border border-orange-400 text-orange-950" },
  },
  fuchsia: {
    1: { pill: "bg-fuchsia-50 text-fuchsia-600",  dot: "bg-fuchsia-300", card: "bg-fuchsia-50 border border-fuchsia-100 text-fuchsia-700"  },
    2: { pill: "bg-fuchsia-100 text-fuchsia-700", dot: "bg-fuchsia-400", card: "bg-fuchsia-50 border border-fuchsia-200 text-fuchsia-800"  },
    3: { pill: "bg-fuchsia-200 text-fuchsia-800", dot: "bg-fuchsia-500", card: "bg-fuchsia-100 border border-fuchsia-300 text-fuchsia-900" },
    4: { pill: "bg-fuchsia-300 text-fuchsia-900", dot: "bg-fuchsia-600", card: "bg-fuchsia-100 border border-fuchsia-400 text-fuchsia-950" },
  },
};

// Flat tokens for round:other, deadline, applied, and manual:* events.
const TOKEN_CLASSES: Record<string, Record<ColorVariant, string>> = {
  "round:other":   { pill: "bg-slate-100 text-slate-700",    dot: "bg-slate-500",    card: "bg-slate-50 border border-slate-200 text-slate-800"    },
  "deadline":      { pill: "bg-rose-100 text-rose-700",      dot: "bg-rose-500",     card: "bg-rose-50 border border-rose-200 text-rose-800"        },
  "applied":       { pill: "bg-emerald-100 text-emerald-700",dot: "bg-emerald-500",  card: "bg-emerald-50 border border-emerald-200 text-emerald-800"},
  "manual:pink":   { pill: "bg-pink-100 text-pink-700",      dot: "bg-pink-500",     card: "bg-pink-50 border border-pink-200 text-pink-800"        },
  "manual:purple": { pill: "bg-purple-100 text-purple-700",  dot: "bg-purple-500",   card: "bg-purple-50 border border-purple-200 text-purple-800"  },
  "manual:lime":   { pill: "bg-lime-100 text-lime-700",      dot: "bg-lime-500",     card: "bg-lime-50 border border-lime-200 text-lime-800"        },
  "manual:yellow": { pill: "bg-yellow-100 text-yellow-700",  dot: "bg-yellow-500",   card: "bg-yellow-50 border border-yellow-200 text-yellow-800"  },
  "manual:red":    { pill: "bg-red-100 text-red-700",        dot: "bg-red-500",      card: "bg-red-50 border border-red-200 text-red-800"           },
};

const FALLBACK_CLASSES: Record<ColorVariant, string> = {
  pill: "bg-gray-100 text-gray-700",
  dot:  "bg-gray-400",
  card: "bg-gray-50 border border-gray-200 text-gray-800",
};

function getRoundClasses(type: InterviewType, step: number, variant: ColorVariant): string {
  const hue = ROUND_HUES[type];
  if (!hue) return TOKEN_CLASSES["round:other"][variant];
  return ROUND_STEP_CLASSES[hue]?.[step]?.[variant] ?? FALLBACK_CLASSES[variant];
}

/** Build the colour token key for an interview-round event. */
export function buildRoundToken(type: InterviewType, roundNumber: number | null): string {
  if (!(type in ROUND_HUES)) return "round:other";
  const step = Math.min(roundNumber ?? 1, 4);
  return `round:${type}:${step}`;
}

/** Resolve the colour token key from a CalendarFeedEvent. */
export function resolveColorKey(event: CalendarFeedEvent): string {
  if (event.source === "interview_round") {
    return buildRoundToken(event.roundType ?? "other", event.roundNumber);
  }
  if (event.source === "deadline") return "deadline";
  if (event.source === "applied")  return "applied";
  if (event.color && event.color in TOKEN_CLASSES) return event.color;
  return "manual:pink";
}

/** Get Tailwind classes for a given token and render variant. */
export function colorClasses(tokenKey: string, variant: ColorVariant): string {
  if (tokenKey === "round:other") {
    return TOKEN_CLASSES["round:other"][variant];
  }
  if (tokenKey.startsWith("round:")) {
    const parts = tokenKey.split(":");
    const type = parts[1] as InterviewType;
    const step = parseInt(parts[2] ?? "1", 10);
    return getRoundClasses(type, step, variant);
  }
  return TOKEN_CLASSES[tokenKey]?.[variant] ?? FALLBACK_CLASSES[variant];
}

/** Colour picker options for the manual event form. */
export const MANUAL_COLOR_OPTIONS: { key: string; label: string }[] = [
  { key: "manual:pink",   label: "Pink"   },
  { key: "manual:purple", label: "Purple" },
  { key: "manual:lime",   label: "Lime"   },
  { key: "manual:yellow", label: "Yellow" },
  { key: "manual:red",    label: "Red"    },
];
