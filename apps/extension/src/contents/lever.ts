import type { PlasmoCSConfig } from "plasmo";

import type {
  ExtractJobRequest,
  ExtractJobResponse,
  SaveJobPayload
} from "@job-tracker/shared";

import {
  extractJobTypeFromText,
  extractRemoteTypeFromText,
  stripHtml
} from "../lib/extract-helpers";

export const config: PlasmoCSConfig = {
  matches: ["https://jobs.lever.co/*"],
  all_frames: false
};

function extractFromDom(): Partial<SaveJobPayload> | null {
  const titleEl =
    document.querySelector<HTMLElement>('[data-qa="posting-name"]') ??
    document.querySelector<HTMLElement>(".posting-headline h2") ??
    document.querySelector<HTMLElement>("h2");

  const companyMeta = document.querySelector<HTMLMetaElement>(
    'meta[property="og:site_name"]'
  );
  let company = companyMeta?.content?.trim() || undefined;
  if (!company) {
    const slug = window.location.pathname.split("/").filter(Boolean)[0];
    if (slug) {
      company = slug
        .split("-")
        .map(w => w.charAt(0).toUpperCase() + w.slice(1))
        .join(" ");
    }
  }

  const locationEl = document.querySelector<HTMLElement>(
    ".sort-by-location, [data-qa='posting-categories'] .location"
  );
  const commitmentEl = document.querySelector<HTMLElement>(
    ".sort-by-commitment, [data-qa='posting-categories'] .commitment"
  );

  const title = titleEl?.textContent?.trim() || undefined;
  const location = locationEl?.textContent?.trim() || undefined;
  const commitmentText = commitmentEl?.textContent?.trim() ?? "";

  const jobType = commitmentText
    ? extractJobTypeFromText(commitmentText)
    : undefined;

  const remoteType =
    location || commitmentText
      ? extractRemoteTypeFromText(`${location ?? ""} ${commitmentText}`)
      : undefined;

  const descEl =
    document.querySelector<HTMLElement>('[data-qa="posting-description"]') ??
    document.querySelector<HTMLElement>(".posting-description");
  const description = descEl?.innerHTML
    ? stripHtml(descEl.innerHTML) || undefined
    : undefined;

  const result: Partial<SaveJobPayload> = {};
  if (title) result.title = title;
  if (company) result.company = company;
  if (location) result.location = location;
  if (remoteType) result.remoteType = remoteType;
  if (jobType) result.jobType = jobType;
  if (description) result.description = description;

  return Object.keys(result).length > 0 ? result : null;
}

function extractJob(): SaveJobPayload | null {
  const fromDom = extractFromDom();
  if (!fromDom?.title || !fromDom?.company) return null;

  return {
    title: fromDom.title,
    company: fromDom.company,
    sourceUrl: window.location.href,
    source: "lever",
    location: fromDom.location,
    remoteType: fromDom.remoteType,
    jobType: fromDom.jobType,
    salaryRaw: fromDom.salaryRaw,
    description: fromDom.description
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
