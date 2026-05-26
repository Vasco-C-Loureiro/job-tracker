import type { PlasmoCSConfig } from "plasmo";

import type {
  ExtractJobRequest,
  ExtractJobResponse,
  SaveJobPayload
} from "@job-tracker/shared";

import {
  extractJobTypeFromText,
  extractRemoteTypeFromText
} from "../lib/extract-helpers";

export const config: PlasmoCSConfig = {
  matches: ["https://*/*", "http://*/*"],
  all_frames: false
};

const KNOWN_HOSTS = [
  "indeed.com",
  "greenhouse.io",
  "lever.co",
  "linkedin.com",
  "workday.com"
];

function isKnownHost(): boolean {
  const { hostname } = window.location;
  return KNOWN_HOSTS.some(h => hostname === h || hostname.endsWith(`.${h}`));
}

function getSourceSlug(): string {
  const parts = window.location.hostname.replace(/^www\./, "").split(".");
  if (parts.length >= 3 && parts[parts.length - 1].length === 2) {
    return parts[parts.length - 3];
  }
  return parts.length >= 2 ? parts[parts.length - 2] : parts[0];
}

function extractJob(): SaveJobPayload | null {
  const h1s = Array.from(document.querySelectorAll<HTMLElement>("h1"));
  const visibleH1 = h1s.find(el => {
    const style = window.getComputedStyle(el);
    return (
      style.display !== "none" &&
      style.visibility !== "hidden" &&
      el.offsetParent !== null
    );
  });
  const title = visibleH1?.textContent?.trim() || undefined;

  const siteNameMeta = document.querySelector<HTMLMetaElement>(
    'meta[property="og:site_name"]'
  );
  const slug = getSourceSlug();
  const company =
    siteNameMeta?.content?.trim() ||
    slug.charAt(0).toUpperCase() + slug.slice(1);

  const locationEl = document.querySelector<HTMLElement>(
    "[class*='location'], [data-testid*='location'], [itemprop='jobLocation']"
  );
  const location = locationEl?.textContent?.trim() || undefined;

  const bodyText = (document.body?.innerText ?? "").slice(0, 5_000);
  const salaryMatch =
    /[£$€]\s*\d[\d,.]*(?:k|K)?\s*[-–]\s*[£$€]?\s*\d[\d,.]*(?:k|K)?|\b\d{2,3}(?:,\d{3})?\s*(?:GBP|USD|EUR)\b/.exec(
      bodyText
    );
  const salary = salaryMatch ? salaryMatch[0].trim() : undefined;

  const descEl = document.querySelector<HTMLElement>(
    "[class*='description'], [class*='job-detail'], main, article"
  );
  const descText = (descEl?.innerText ?? "").slice(0, 2_000);
  const scanText = `${title ?? ""} ${location ?? ""} ${descText}`;

  const remoteType = extractRemoteTypeFromText(scanText);
  const jobType = extractJobTypeFromText(scanText);

  if (!title) return null;

  return {
    title,
    company,
    sourceUrl: window.location.href,
    source: slug,
    location,
    remoteType,
    jobType,
    salaryRaw: salary
  };
}

chrome.runtime.onMessage.addListener(
  (
    message: ExtractJobRequest,
    _sender,
    sendResponse: (response: ExtractJobResponse) => void
  ) => {
    if (message?.type !== "EXTRACT_JOB") return;

    if (isKnownHost()) return;

    const payload = extractJob();
    sendResponse(
      payload
        ? { ok: true, payload }
        : { ok: false, reason: "extraction-failed" }
    );
  }
);
