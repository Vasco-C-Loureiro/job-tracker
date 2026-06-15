import type { InterviewType } from "@job-tracker/shared";

/** 1 → "1st", 2 → "2nd", 3 → "3rd", 4 → "4th", etc. */
export function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] ?? s[v] ?? s[0]);
}

const INTERVIEW_TYPE_LABELS: Record<InterviewType, string> = {
  "screening":           "Screening",
  "technical-phone":     "Technical phone",
  "take-home":           "Take-home task",
  "coding":              "Coding interview",
  "pair-programming":    "Pair programming",
  "technical-deep-dive": "Technical deep dive",
  "system-design":       "System design",
  "behavioral":          "Behavioural",
  "panel":               "Panel interview",
  "final":               "Final round",
  "other":               "Interview",
};

export function interviewTypeLabel(type: InterviewType): string {
  return INTERVIEW_TYPE_LABELS[type] ?? "Interview";
}

export function roundTitle(roundNumber: number, type: InterviewType): string {
  return `${ordinal(roundNumber)} round – ${interviewTypeLabel(type)}`;
}

export function deadlineTitle(company: string): string {
  return `Deadline – ${company}`;
}

export function appliedTitle(company: string): string {
  return company;
}
