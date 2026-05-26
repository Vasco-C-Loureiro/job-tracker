import type { PlasmoCSConfig } from "plasmo";

import type {
  ExtractJobRequest,
  ExtractJobResponse,
  JobType,
  RemoteType,
  SaveJobPayload
} from "@job-tracker/shared";

export const config: PlasmoCSConfig = {
  matches: ["https://*.indeed.com/*"],
  all_frames: false
};

// ─── Helpers ─────────────────────────────────────────────────────

const CURRENCY_SYMBOLS: Record<string, string> = {
  GBP: "£",
  USD: "$",
  EUR: "€",
  CAD: "CA$",
  AUD: "A$"
};

const EMPLOYMENT_TYPE_MAP: Partial<Record<string, JobType>> = {
  FULL_TIME: "full-time",
  PART_TIME: "part-time",
  CONTRACTOR: "contract",
  INTERN: "internship",
  PERMANENT: "permanent"
};

// Ordered most-specific first to avoid "full" matching before "full-time"
const JOB_TYPE_TEXT_MAP: Array<[string, JobType]> = [
  ["full-time", "full-time"],
  ["full time", "full-time"],
  ["part-time", "part-time"],
  ["part time", "part-time"],
  ["contract", "contract"],
  ["internship", "internship"],
  ["graduate", "graduate"],
  ["fixed-term", "fixed-term"],
  ["fixed term", "fixed-term"],
  ["permanent", "permanent"],
];

function extractJobTypeFromText(text: string): JobType | undefined {
  const lower = text.toLowerCase();
  for (const [term, jobType] of JOB_TYPE_TEXT_MAP) {
    if (lower.includes(term)) return jobType;
  }
  return undefined;
}

const UNIT_TEXT_MAP: Record<string, string> = {
  YEAR: "/year",
  MONTH: "/month",
  WEEK: "/week",
  HOUR: "/hour"
};

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, "").trim();
}

// Extracts just the numeric salary portion from a raw DOM string that may
// include trailing text like "a year - Permanent, Full-time".
// Handles symbol-prefix (£/$/ €) and symbol-suffix (kr/SEK) currencies,
// and correctly identifies ranges when the separator is "-" or "to" followed
// by another currency value — not by plain text.
function parseSalaryValue(raw: string): string | undefined {
  // Symbol-prefix currencies — try longer prefixes first (CA$ before $)
  const prefixRe = /(CA\$|A\$|[£$€])([\d,]+)/g;
  const prefixMatches: RegExpExecArray[] = [];
  let m: RegExpExecArray | null;
  while ((m = prefixRe.exec(raw)) !== null) prefixMatches.push(m);

  if (prefixMatches.length > 0) {
    const first = prefixMatches[0];
    const firstVal = `${first[1]}${first[2]}`;
    if (prefixMatches.length >= 2) {
      const between = raw.slice(first.index + first[0].length, prefixMatches[1].index);
      // Range only when separator is purely "-" / "–" / "to" — not when followed by words
      if (/^\s*[-–]\s*$/.test(between) || /^\s+to\s+$/i.test(between)) {
        const second = prefixMatches[1];
        return `${firstVal} - ${second[1]}${second[2]}`;
      }
    }
    return firstVal;
  }

  // Symbol-suffix currencies: "450,000 kr", "300,000 SEK", etc.
  const suffixRe = /([\d,]+)\s*(kr|SEK|DKK|NOK)\b/gi;
  const suffixMatches: RegExpExecArray[] = [];
  while ((m = suffixRe.exec(raw)) !== null) suffixMatches.push(m);

  if (suffixMatches.length > 0) {
    const first = suffixMatches[0];
    const firstVal = `${first[1]} ${first[2]}`;
    if (suffixMatches.length >= 2) {
      const between = raw.slice(first.index + first[0].length, suffixMatches[1].index);
      if (/^\s*[-–]\s*$/.test(between) || /^\s+to\s+$/i.test(between)) {
        const second = suffixMatches[1];
        return `${firstVal} - ${second[1]} ${second[2]}`;
      }
    }
    return firstVal;
  }

  return undefined;
}

// ─── Layer 1: JSON-LD ────────────────────────────────────────────
// Indeed exposes a schema.org JobPosting on viewjob pages for Google
// Jobs SEO. Most stable extraction strategy when present.

function extractFromJsonLd(): Partial<SaveJobPayload> | null {
  const scripts = document.querySelectorAll<HTMLScriptElement>(
    'script[type="application/ld+json"]'
  );

  for (const script of scripts) {
    try {
      const data = JSON.parse(script.textContent ?? "");
      const items = Array.isArray(data) ? data : [data];

      for (const item of items) {
        if (item?.["@type"] !== "JobPosting") continue;

        const title = typeof item.title === "string" ? item.title : undefined;
        const company =
          typeof item?.hiringOrganization?.name === "string"
            ? item.hiringOrganization.name
            : undefined;

        if (!title || !company) continue;

        // location — "Remote" for telecommute, otherwise "City, Country"
        let location: string | undefined;
        if (item.jobLocationType === "TELECOMMUTE") {
          location = "Remote";
        } else if (item.jobLocation?.address) {
          const addr = item.jobLocation.address;
          const city =
            typeof addr.addressLocality === "string"
              ? addr.addressLocality
              : undefined;
          const country =
            typeof addr.addressCountry === "string"
              ? addr.addressCountry
              : undefined;
          if (city && country) location = `${city}, ${country}`;
          else location = city ?? country;
        }

        // remoteType — telecommute → "remote"; scan text for "hybrid"; else "onsite"
        let remoteType: RemoteType | undefined;
        if (item.jobLocationType === "TELECOMMUTE") {
          remoteType = "remote";
        } else {
          const scanText = [
            typeof item.title === "string" ? item.title : "",
            typeof item.description === "string" ? item.description : ""
          ]
            .join(" ")
            .toLowerCase();
          remoteType = scanText.includes("hybrid") ? "hybrid" : "onsite";
        }

        // jobType — map schema.org employmentType to our enum
        // employmentType may be a string or an array (both occur on Indeed)
        const rawEmpType =
          typeof item.employmentType === "string"
            ? item.employmentType
            : Array.isArray(item.employmentType) &&
                typeof item.employmentType[0] === "string"
              ? item.employmentType[0]
              : undefined;
        const jobType: JobType | undefined = rawEmpType
          ? EMPLOYMENT_TYPE_MAP[rawEmpType]
          : undefined;

        // salary — compose from baseSalary.value
        let salary: string | undefined;
        const bs = item.baseSalary;
        if (bs?.value) {
          const bsv = bs.value;
          const currencyCode =
            typeof bs.currency === "string" ? bs.currency : "";
          const sym = CURRENCY_SYMBOLS[currencyCode] ?? currencyCode;
          const unit =
            typeof bsv.unitText === "string"
              ? (UNIT_TEXT_MAP[bsv.unitText] ??
                `/${bsv.unitText.toLowerCase()}`)
              : "";
          if (
            typeof bsv.minValue === "number" &&
            typeof bsv.maxValue === "number"
          ) {
            salary = `${sym}${bsv.minValue.toLocaleString("en-GB")}–${sym}${bsv.maxValue.toLocaleString("en-GB")}${unit}`;
          } else if (typeof bsv.value === "number") {
            salary = `${sym}${bsv.value.toLocaleString("en-GB")}${unit}`;
          }
        }

        // description — strip HTML tags
        const rawDesc =
          typeof item.description === "string" ? item.description : undefined;
        const description = rawDesc ? stripHtml(rawDesc) || undefined : undefined;

        return { title, company, location, remoteType, jobType, salaryRaw: salary, description };
      }
    } catch {
      // Malformed JSON in this <script>, try the next one
    }
  }

  return null;
}

// ─── Layer 2: DOM selectors ──────────────────────────────────────
// Fallback for pages where JSON-LD is missing or incomplete.
// Returns whatever fields it finds — null only if nothing at all is found.
// Indeed's selectors as of 2025 — fragile, expect breakage.

function extractFromDom(): Partial<SaveJobPayload> | null {
  const titleEl = document.querySelector<HTMLHeadingElement>(
    'h1[data-testid="jobsearch-JobInfoHeader-title"], h1.jobsearch-JobInfoHeader-title'
  );
  const companyEl = document.querySelector<HTMLElement>(
    '[data-testid="inlineHeader-companyName"] a, [data-testid="inlineHeader-companyName"], [data-company-name="true"]'
  );
  const locationEl = document.querySelector<HTMLElement>(
    '[data-testid="inlineHeader-companyLocation"], [data-testid="job-location"]'
  );
  const salaryEl = document.querySelector<HTMLElement>(
    '[data-testid="jobsearch-SalaryInfoAndJobType"], #salaryInfoAndJobType'
  );
  const jobTypeEls = document.querySelectorAll<HTMLElement>(
    '[data-testid="jobsearch-JobInfoHeader-jobType"] span, [data-testid="job-types"] span, [data-testid="attributesHeader"] span, .css-k5flys span'
  );

  const title = titleEl?.textContent?.trim() || undefined;
  const company = companyEl?.textContent?.trim() || undefined;
  const location = locationEl?.textContent?.trim() || undefined;
  const salary = salaryEl?.textContent?.trim() || undefined;

  let jobType: JobType | undefined;
  let remoteType: RemoteType | undefined;

  // Attempt 1: structured span elements (header badge area)
  for (const el of jobTypeEls) {
    const text = el.textContent?.trim().toLowerCase() ?? "";
    if (!jobType) jobType = extractJobTypeFromText(text);
    if (!remoteType) {
      if (text.includes("remote")) remoteType = "remote";
      else if (text.includes("hybrid")) remoteType = "hybrid";
      else if (
        text.includes("on-site") ||
        text.includes("onsite") ||
        text.includes("in person")
      )
        remoteType = "onsite";
    }
  }

  // Attempt 2: OtherJobDetailsContainer — stable data-testid confirmed present
  // on viewjob pages; job type appears as plain text inside this container
  if (!jobType) {
    const otherDetails = document.querySelector(
      '[data-testid="jobsearch-OtherJobDetailsContainer"]'
    );
    if (otherDetails) jobType = extractJobTypeFromText(otherDetails.textContent ?? "");
  }

  // Attempt 3: structured "Job type" item block further down the page
  if (!jobType) {
    const jobTypeItem = document.querySelector(
      '[data-testid="JobInfoItem-jobType"], [data-testid="job-type-details"]'
    );
    if (jobTypeItem) jobType = extractJobTypeFromText(jobTypeItem.textContent ?? "");
  }

  const result: Partial<SaveJobPayload> = {};
  if (title) result.title = title;
  if (company) result.company = company;
  if (location) result.location = location;
  if (remoteType) result.remoteType = remoteType;
  if (jobType) result.jobType = jobType;
  if (salary) result.salaryRaw = salary;

  return Object.keys(result).length > 0 ? result : null;
}

// ─── Layer 3: DOM salary fallback ───────────────────────────────
// Called when neither JSON-LD nor the header DOM element yielded a salary.
// Covers the "Pay" row in Indeed's structured Job Details panel, which is
// further down the page and uses different selectors.

function extractSalaryFromDom(): string | undefined {
  // 1. Header salary element (same selectors as extractFromDom, belt-and-suspenders)
  const headerEl = document.querySelector<HTMLElement>(
    '[data-testid="jobsearch-SalaryInfoAndJobType"], #salaryInfoAndJobType'
  );
  if (headerEl?.textContent?.trim()) return headerEl.textContent.trim();

  // 2. Job Details panel "Pay" row — data-testid variations Indeed has used
  const payItemEl = document.querySelector<HTMLElement>(
    '[data-testid="JobInfoItem-pay"], [data-testid="salaryInfoItem"], [data-testid*="salary"]'
  );
  if (payItemEl?.textContent?.trim()) {
    // Strip the "Pay" label that Indeed prepends inside this element
    return payItemEl.textContent.replace(/^pay[\s:]+/i, "").trim() || payItemEl.textContent.trim();
  }

  // 3. Find a leaf element labelled "Pay" and read its adjacent value element
  for (const leaf of document.querySelectorAll<HTMLElement>("span, div, p")) {
    if (leaf.childElementCount !== 0) continue;
    if (!/^pay\s*:?\s*$/i.test(leaf.textContent?.trim() ?? "")) continue;
    const sibling = leaf.nextElementSibling as HTMLElement | null;
    if (sibling?.textContent?.trim()) return sibling.textContent.trim();
    const parentSibling = leaf.parentElement?.nextElementSibling as HTMLElement | null;
    if (parentSibling?.textContent?.trim()) return parentSibling.textContent.trim();
  }

  return undefined;
}

// ─── Orchestrator ────────────────────────────────────────────────
// Field-level merge: JSON-LD runs first and wins on any field it populates;
// DOM fills in only the gaps.

function extractJob(): SaveJobPayload | null {
  const fromJsonLd = extractFromJsonLd() ?? {};
  const fromDom = extractFromDom() ?? {};
  const merged = { ...fromDom, ...fromJsonLd }; // JSON-LD wins on overlap

  // Clean DOM-sourced salary: strips trailing "a year - Permanent, Full-time" etc.
  // Only applied when JSON-LD did not supply its own already-structured salary.
  if (!fromJsonLd.salaryRaw && merged.salaryRaw) {
    merged.salaryRaw = parseSalaryValue(merged.salaryRaw) ?? merged.salaryRaw;
  }

  // Post-merge fallback: JSON-LD may have spread salaryRaw: undefined over a valid
  // DOM salary. Search the full DOM (header + Job Details panel) and clean the result.
  if (!merged.salaryRaw) {
    const fallback = extractSalaryFromDom();
    if (fallback) merged.salaryRaw = parseSalaryValue(fallback) ?? fallback;
  }

  if (!merged.title || !merged.company) return null;

  const description = document.body.innerText
    .trim()
    .replace(/\n{3,}/g, "\n\n");

  return {
    title: merged.title,
    company: merged.company,
    sourceUrl: window.location.href,
    source: "indeed",
    location: merged.location,
    remoteType: merged.remoteType,
    jobType: merged.jobType,
    salaryRaw: merged.salaryRaw,
    description
  };
}

// ─── Message handler ─────────────────────────────────────────────

chrome.runtime.onMessage.addListener(
  (
    message: ExtractJobRequest,
    _sender,
    sendResponse: (response: ExtractJobResponse) => void
  ) => {
    if (message?.type !== "EXTRACT_JOB") return;

    const payload = extractJob();
    sendResponse(
      payload
        ? { ok: true, payload }
        : { ok: false, reason: "extraction-failed" }
    );
    // Sync response — no `return true` needed.
  }
);
