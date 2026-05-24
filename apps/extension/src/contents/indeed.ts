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

const UNIT_TEXT_MAP: Record<string, string> = {
  YEAR: "/year",
  MONTH: "/month",
  WEEK: "/week",
  HOUR: "/hour"
};

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, "").trim();
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
        const rawEmpType =
          typeof item.employmentType === "string"
            ? item.employmentType
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

        return { title, company, location, remoteType, jobType, salary, description };
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
    '[data-testid="jobsearch-JobInfoHeader-jobType"] span'
  );

  const title = titleEl?.textContent?.trim() || undefined;
  const company = companyEl?.textContent?.trim() || undefined;
  const location = locationEl?.textContent?.trim() || undefined;
  const salary = salaryEl?.textContent?.trim() || undefined;

  let jobType: JobType | undefined;
  let remoteType: RemoteType | undefined;
  for (const el of jobTypeEls) {
    const text = el.textContent?.trim().toLowerCase() ?? "";
    if (!jobType) {
      if (text.includes("full")) jobType = "full-time";
      else if (text.includes("part")) jobType = "part-time";
      else if (text.includes("contract")) jobType = "contract";
      else if (text.includes("intern")) jobType = "internship";
      else if (text.includes("graduate") || text.includes("grad"))
        jobType = "graduate";
      else if (text.includes("fixed")) jobType = "fixed-term";
    }
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

  const result: Partial<SaveJobPayload> = {};
  if (title) result.title = title;
  if (company) result.company = company;
  if (location) result.location = location;
  if (remoteType) result.remoteType = remoteType;
  if (jobType) result.jobType = jobType;
  if (salary) result.salary = salary;

  return Object.keys(result).length > 0 ? result : null;
}

// ─── Orchestrator ────────────────────────────────────────────────
// Field-level merge: JSON-LD runs first and wins on any field it populates;
// DOM fills in only the gaps.

function extractJob(): SaveJobPayload | null {
  const fromJsonLd = extractFromJsonLd() ?? {};
  const fromDom = extractFromDom() ?? {};
  const merged = { ...fromDom, ...fromJsonLd }; // JSON-LD wins on overlap

  if (!merged.title || !merged.company) return null;

  return {
    title: merged.title,
    company: merged.company,
    sourceUrl: window.location.href,
    source: "indeed",
    location: merged.location,
    remoteType: merged.remoteType,
    jobType: merged.jobType,
    salary: merged.salary,
    description: merged.description
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
