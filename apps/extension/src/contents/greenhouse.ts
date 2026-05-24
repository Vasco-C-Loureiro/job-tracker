import type { PlasmoCSConfig } from "plasmo";

import type {
  ExtractJobRequest,
  ExtractJobResponse,
  SaveJobPayload
} from "@job-tracker/shared";

import { extractFromJsonLd } from "../lib/extract-json-ld";

export const config: PlasmoCSConfig = {
  matches: ["https://boards.greenhouse.io/*", "https://*.greenhouse.io/*"],
  all_frames: false
};

function extractFromDom(): Partial<SaveJobPayload> | null {
  const titleEl =
    document.querySelector<HTMLElement>("h1.app-title") ??
    document.querySelector<HTMLElement>("#app_body h1") ??
    document.querySelector<HTMLElement>("h1");

  const companyMeta = document.querySelector<HTMLMetaElement>(
    'meta[property="og:site_name"]'
  );
  let company = companyMeta?.content?.trim() || undefined;
  if (!company) {
    const atMatch = / at (.+)$/.exec(document.title);
    if (atMatch) company = atMatch[1].trim();
  }

  const locationEl = document.querySelector<HTMLElement>(
    ".location, [class*='location']"
  );

  const title = titleEl?.textContent?.trim() || undefined;
  const location = locationEl?.textContent?.trim() || undefined;

  const result: Partial<SaveJobPayload> = {};
  if (title) result.title = title;
  if (company) result.company = company;
  if (location) result.location = location;

  return Object.keys(result).length > 0 ? result : null;
}

function extractJob(): SaveJobPayload | null {
  const fromJsonLd = extractFromJsonLd() ?? {};
  const fromDom = extractFromDom() ?? {};
  const merged = { ...fromDom, ...fromJsonLd };

  if (!merged.title || !merged.company) return null;

  return {
    title: merged.title,
    company: merged.company,
    sourceUrl: window.location.href,
    source: "greenhouse",
    location: merged.location,
    remoteType: merged.remoteType,
    jobType: merged.jobType,
    salary: merged.salary,
    description: merged.description
  };
}

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
  }
);
