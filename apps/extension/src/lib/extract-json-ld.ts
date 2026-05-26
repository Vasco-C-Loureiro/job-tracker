import type { JobType, RemoteType, SaveJobPayload } from "@job-tracker/shared";
import {
  CURRENCY_SYMBOLS,
  EMPLOYMENT_TYPE_MAP,
  UNIT_TEXT_MAP,
  stripHtml
} from "./extract-helpers";

/**
 * Generic schema.org JobPosting JSON-LD extractor.
 * Shared by all site-specific content scripts.
 * Returns a partial payload (never includes source/sourceUrl — caller sets those).
 * Returns null if no valid JobPosting block is found.
 */
export function extractFromJsonLd(): Partial<SaveJobPayload> | null {
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

        const rawDesc =
          typeof item.description === "string" ? item.description : undefined;
        const description = rawDesc ? stripHtml(rawDesc) || undefined : undefined;

        return { title, company, location, remoteType, jobType, salaryRaw: salary, description };
      }
    } catch {
      // Malformed JSON in this script tag — try the next one
    }
  }

  return null;
}
