import type { PlasmoCSConfig } from "plasmo";

import type {
  ExtractJobRequest,
  ExtractJobResponse,
  SaveJobPayload
} from "@job-tracker/shared";

export const config: PlasmoCSConfig = {
  matches: ["https://*.indeed.com/*"],
  all_frames: false
};

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

        if (title && company) return { title, company };
      }
    } catch {
      // Malformed JSON in this <script>, try the next one
    }
  }

  return null;
}

// ─── Layer 2: DOM selectors ──────────────────────────────────────
// Fallback for pages where JSON-LD is missing or incomplete.
// Indeed's selectors as of 2025 — fragile, expect breakage.

function extractFromDom(): Partial<SaveJobPayload> | null {
  const titleEl = document.querySelector<HTMLHeadingElement>(
    'h1[data-testid="jobsearch-JobInfoHeader-title"], h1.jobsearch-JobInfoHeader-title'
  );
  const companyEl = document.querySelector<HTMLElement>(
    '[data-testid="inlineHeader-companyName"] a, [data-testid="inlineHeader-companyName"], [data-company-name="true"]'
  );

  const title = titleEl?.textContent?.trim();
  const company = companyEl?.textContent?.trim();

  if (title && company) return { title, company };
  return null;
}

// ─── Orchestrator ────────────────────────────────────────────────

function extractJob(): SaveJobPayload | null {
  const extracted = extractFromJsonLd() ?? extractFromDom();
  if (!extracted?.title || !extracted?.company) return null;

  return {
    title: extracted.title,
    company: extracted.company,
    sourceUrl: window.location.href,
    source: "indeed"
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
