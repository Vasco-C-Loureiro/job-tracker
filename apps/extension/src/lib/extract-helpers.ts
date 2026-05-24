import type { JobType, RemoteType } from "@job-tracker/shared";

export const CURRENCY_SYMBOLS: Record<string, string> = {
  GBP: "£",
  USD: "$",
  EUR: "€",
  CAD: "CA$",
  AUD: "A$"
};

export const EMPLOYMENT_TYPE_MAP: Partial<Record<string, JobType>> = {
  FULL_TIME: "full-time",
  PART_TIME: "part-time",
  CONTRACTOR: "contract",
  INTERN: "internship",
  PERMANENT: "permanent"
};

export const JOB_TYPE_TEXT_MAP: Array<[string, JobType]> = [
  ["full-time", "full-time"],
  ["full time", "full-time"],
  ["part-time", "part-time"],
  ["part time", "part-time"],
  ["contract", "contract"],
  ["internship", "internship"],
  ["graduate", "graduate"],
  ["fixed-term", "fixed-term"],
  ["fixed term", "fixed-term"],
  ["permanent", "permanent"]
];

export function extractJobTypeFromText(text: string): JobType | undefined {
  const lower = text.toLowerCase();
  for (const [term, jobType] of JOB_TYPE_TEXT_MAP) {
    if (lower.includes(term)) return jobType;
  }
  return undefined;
}

export function extractRemoteTypeFromText(text: string): RemoteType | undefined {
  const lower = text.toLowerCase();
  if (lower.includes("remote")) return "remote";
  if (lower.includes("hybrid")) return "hybrid";
  if (
    lower.includes("on-site") ||
    lower.includes("onsite") ||
    lower.includes("in person")
  )
    return "onsite";
  return undefined;
}

export const UNIT_TEXT_MAP: Record<string, string> = {
  YEAR: "/year",
  MONTH: "/month",
  WEEK: "/week",
  HOUR: "/hour"
};

export function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, "").trim();
}
