/**
 * Security utilities for the extension popup.
 * All external URLs opened via chrome.tabs.create must pass through
 * safeOpenUrl(). All job IDs from API responses must pass through
 * isValidJobId() before being used in any URL or API call.
 */

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** Returns true only for standard UUID v4 strings. */
export function isValidJobId(id: unknown): id is string {
  return typeof id === 'string' && UUID_REGEX.test(id)
}

/**
 * Opens a URL in a new tab. Only allows https:// URLs — rejects
 * javascript:, data:, file:, and any other schemes silently.
 */
export function safeOpenUrl(url: string): void {
  if (!url.startsWith('https://')) return
  chrome.tabs.create({ url })
}

/**
 * Constructs the dashboard URL with a highlight query param and opens it.
 * Validates the job ID as a UUID and the base URL as https:// before opening.
 */
export function openDashboardHighlight(jobId: string): void {
  if (!isValidJobId(jobId)) return

  const base = process.env.PLASMO_PUBLIC_DASHBOARD_URL
  if (!base) return

  try {
    const url = new URL(base)
    url.searchParams.set('highlight', jobId)
    safeOpenUrl(url.toString())
  } catch {
    // URL construction failed — do nothing
  }
}
