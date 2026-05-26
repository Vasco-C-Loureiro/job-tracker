import type {
  ExtractJobRequest,
  ExtractJobResponse,
  JobType,
  RemoteType,
  SaveJobPayload
} from "@job-tracker/shared"
import { useEffect, useState } from "react"

import {
  clearTokens,
  getSessionFromDashboard,
  getStoredTokens,
  getValidToken,
  isTokenExpired,
  refreshTokens,
  signInWithEmail
} from "./lib/auth"

const API_URL = `${process.env.PLASMO_PUBLIC_DASHBOARD_URL}/api/jobs`
const DASHBOARD_URL = process.env.PLASMO_PUBLIC_DASHBOARD_URL

type AuthState = "checking" | "signed-out" | "signed-in"

type SaveState =
  | { kind: "idle" }
  | { kind: "saving" }
  | { kind: "preview"; payload: SaveJobPayload }
  | { kind: "success"; payload: SaveJobPayload }
  | { kind: "error"; message: string }

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "4px 8px",
  fontSize: 13,
  border: "1px solid #d1d5db",
  borderRadius: 4,
  boxSizing: "border-box"
}

const labelStyle: React.CSSProperties = {
  fontSize: 11,
  color: "#6b7280",
  display: "block",
  marginBottom: 2
}

const salarySelectStyle: React.CSSProperties = {
  padding: "4px 4px",
  fontSize: 13,
  border: "1px solid #d1d5db",
  borderRadius: 4
}

const SALARY_CURRENCIES = ["£", "$", "€", "kr"] as const

const SYMBOL_TO_CODE: Record<string, string> = {
  "£": "GBP",
  "$": "USD",
  "€": "EUR",
  "kr": "SEK",
}

function splitSalary(salary: string | undefined): { currencyCode: string; raw: string } {
  if (!salary) return { currencyCode: "GBP", raw: "" }
  for (const prefix of SALARY_CURRENCIES) {
    if (salary.startsWith(prefix)) {
      return { currencyCode: SYMBOL_TO_CODE[prefix] ?? "GBP", raw: salary.slice(prefix.length).trim() }
    }
  }
  return { currencyCode: "GBP", raw: salary }
}

function salaryKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
  const control = ["Backspace", "Delete", "Tab", "ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"]
  if (!control.includes(e.key) && !/^[0-9,.\-kK]$/.test(e.key)) e.preventDefault()
}

async function sendExtractMessage(
  tabId: number
): Promise<ExtractJobResponse | null> {
  const request: ExtractJobRequest = { type: "EXTRACT_JOB" }
  try {
    return (await chrome.tabs.sendMessage(tabId, request)) as ExtractJobResponse
  } catch {
    return null
  }
}

function IndexPopup() {
  const [authState, setAuthState] = useState<AuthState>("checking")
  const [saveState, setSaveState] = useState<SaveState>({ kind: "idle" })
  const [previewFields, setPreviewFields] = useState<SaveJobPayload | null>(null)
  const [confirming, setConfirming] = useState(false)
  const [showFullEdit, setShowFullEdit] = useState(false)
  const [initiallyMissingFields, setInitiallyMissingFields] = useState<Set<keyof SaveJobPayload>>(new Set())
  const [salaryCurrency, setSalaryCurrency] = useState("GBP")
  const [salaryRaw, setSalaryRaw] = useState("")
  const [authError, setAuthError] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [signInError, setSignInError] = useState("")
  const [signingIn, setSigningIn] = useState(false)

  useEffect(() => {
    const init = async () => {
      // Pre-load email for form pre-fill regardless of auth outcome
      const { userEmail } = await chrome.storage.local.get("userEmail")
      if (typeof userEmail === "string") setEmail(userEmail)

      const stored = await getStoredTokens()
      if (stored) {
        if (!isTokenExpired(stored.expiresAt)) {
          setAuthState("signed-in")
          return
        }
        const refreshed = await refreshTokens(stored.refreshToken)
        if (refreshed) {
          setAuthState("signed-in")
          return
        }
        setAuthState("signed-out")
        return
      }

      const session = await getSessionFromDashboard()
      if (session) {
        setAuthState("signed-in")
        return
      }

      setAuthState("signed-out")
    }
    init()
  }, [])

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    setSigningIn(true)
    setSignInError("")
    const result = await signInWithEmail(email, password)
    if (result) {
      setAuthError("")
      setAuthState("signed-in")
    } else {
      setSignInError("Incorrect email or password.")
    }
    setSigningIn(false)
  }

  const handleSignOut = async () => {
    await clearTokens()
    setSaveState({ kind: "idle" })
    setAuthState("signed-out")
  }

  const handleSave = async () => {
    setSaveState({ kind: "saving" })

    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true
    })

    if (!tab?.id) {
      setSaveState({ kind: "error", message: "No active tab found." })
      return
    }

    // Step 1 — ask the content script to extract the job
    const response = await sendExtractMessage(tab.id)
    if (response === null) {
      setSaveState({
        kind: "error",
        message: "This page isn't supported yet. Open an Indeed job listing."
      })
      return
    }

    // "reason" in response narrows to the error branch; "!response.ok"
    // should do the same but TS 5.3.3 (Plasmo's pinned version) misses it.
    // Revisit when we bump TS — see chore/ts-bump.
    if ("reason" in response) {
      setSaveState({
        kind: "error",
        message:
          response.reason === "extraction-failed"
            ? "Couldn't find a job on this page."
            : "Page not supported."
      })
      return
    }

    // Transition to preview — token check and POST happen on confirm
    const payload: SaveJobPayload = {
      ...response.payload,
      description: response.payload.description
    }
    const displayFields: Array<keyof SaveJobPayload> = ["title", "company", "location", "remoteType", "jobType", "salaryRaw"]
    setInitiallyMissingFields(new Set(displayFields.filter((k) => !payload[k])))
    const { currencyCode, raw } = splitSalary(payload.salaryRaw)
    setSalaryCurrency(currencyCode)
    setSalaryRaw(raw)
    setPreviewFields(payload)
    setSaveState({ kind: "preview", payload })
  }

  if (authState === "checking") {
    return (
      <div
        style={{
          width: 300,
          padding: 16,
          fontFamily: "system-ui, -apple-system, sans-serif",
          color: "#6b7280",
          fontSize: 14
        }}>
        Loading…
      </div>
    )
  }

  if (authState === "signed-out") {
    return (
      <div
        style={{
          width: 300,
          padding: 16,
          fontFamily: "system-ui, -apple-system, sans-serif"
        }}>
        <h1 style={{ fontSize: 16, margin: "0 0 12px" }}>Job Tracker</h1>
        {authError && (
          <div style={{ color: "#dc2626", fontSize: 13, marginBottom: 10 }}>
            {authError}
          </div>
        )}
        <form onSubmit={handleSignIn}>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={{
              width: "100%",
              padding: "7px 10px",
              fontSize: 14,
              border: "1px solid #d1d5db",
              borderRadius: 6,
              marginBottom: 8,
              boxSizing: "border-box"
            }}
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            style={{
              width: "100%",
              padding: "7px 10px",
              fontSize: 14,
              border: "1px solid #d1d5db",
              borderRadius: 6,
              marginBottom: 8,
              boxSizing: "border-box"
            }}
          />
          {signInError && (
            <div style={{ color: "#dc2626", fontSize: 13, marginBottom: 8 }}>
              {signInError}
            </div>
          )}
          <button
            type="submit"
            disabled={signingIn}
            style={{
              width: "100%",
              padding: "8px 12px",
              fontSize: 14,
              fontWeight: 600,
              cursor: signingIn ? "wait" : "pointer",
              background: "#2563eb",
              color: "white",
              border: "none",
              borderRadius: 6,
              marginBottom: 8
            }}>
            {signingIn ? "Signing in…" : "Sign In"}
          </button>
        </form>
        <button
          onClick={() => chrome.tabs.create({ url: `${DASHBOARD_URL}/login` })}
          style={{
            width: "100%",
            padding: "8px 12px",
            fontSize: 14,
            fontWeight: 600,
            cursor: "pointer",
            background: "white",
            color: "#374151",
            border: "1px solid #d1d5db",
            borderRadius: 6,
            marginBottom: 6
          }}>
          Sign in with Google
        </button>
        <div style={{ fontSize: 12, color: "#9ca3af", textAlign: "center" }}>
          Return to this popup after signing in.
        </div>
      </div>
    )
  }

  const handleConfirm = async () => {
    if (!previewFields || confirming) return
    setConfirming(true)

    const token = await getValidToken()
    console.log("[job-tracker] token:", token ? `${token.slice(0, 20)}…` : null)
    if (!token) {
      setSaveState({ kind: "error", message: "Session expired — please sign in again" })
      setAuthError("Session expired — please sign in again.")
      setAuthState("signed-out")
      setConfirming(false)
      return
    }

    try {
      const apiResponse = await fetch(API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(previewFields)
      })

      console.log("[job-tracker] POST /api/jobs status:", apiResponse.status)

      if (apiResponse.status === 401) {
        console.log("[job-tracker] 401 received, clearing tokens")
        await clearTokens()
        setAuthError("Session expired — please sign in again.")
        setAuthState("signed-out")
        setSaveState({ kind: "error", message: "Session expired — please sign in again." })
        setConfirming(false)
        return
      }

      if (!apiResponse.ok) {
        const errorBody = await apiResponse.json().catch(() => ({}))
        setSaveState({
          kind: "error",
          message: errorBody.error ?? `Save failed (${apiResponse.status})`
        })
        setConfirming(false)
        return
      }

      console.log("[job-tracker] 201 success")
      setSaveState({ kind: "success", payload: previewFields })
    } catch {
      setSaveState({
        kind: "error",
        message: "Couldn't reach the backend. Is the dev server running?"
      })
    }
    setConfirming(false)
  }

  const handleCancel = () => {
    setPreviewFields(null)
    setShowFullEdit(false)
    setInitiallyMissingFields(new Set())
    setSalaryCurrency("GBP")
    setSalaryRaw("")
    setSaveState({ kind: "idle" })
  }

  function updateField<K extends keyof SaveJobPayload>(
    field: K,
    value: SaveJobPayload[K]
  ) {
    setPreviewFields((prev) => (prev ? { ...prev, [field]: value } : null))
  }

  const topBar = (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "8px 16px",
        borderBottom: "1px solid #e5e7eb"
      }}>
      <button
        onClick={() => chrome.tabs.create({ url: DASHBOARD_URL })}
        style={{
          fontSize: 13,
          fontWeight: 600,
          color: "#2563eb",
          background: "none",
          border: "none",
          cursor: "pointer",
          padding: 0
        }}>
        Open Dashboard →
      </button>
      <button
        onClick={handleSignOut}
        style={{
          fontSize: 12,
          color: "#6b7280",
          background: "none",
          border: "none",
          cursor: "pointer",
          padding: 0
        }}>
        Sign out
      </button>
    </div>
  )

  if (saveState.kind === "preview" && previewFields) {
    const hasTitle = !!previewFields.title
    const hasCompany = !!previewFields.company
    const hasLocation = !!previewFields.location
    const hasRemoteType = !!previewFields.remoteType
    const hasJobType = !!previewFields.jobType
    const hasSalary = !!previewFields.salaryRaw
    const anyExtracted =
      hasTitle || hasCompany || hasLocation || hasRemoteType || hasJobType || hasSalary

    const infoLabel: React.CSSProperties = {
      fontSize: 10,
      color: "#9ca3af",
      display: "block",
      marginBottom: 1
    }
    const infoValue: React.CSSProperties = { fontSize: 13, color: "#111827" }

    const confirmCancelRow = (
      <div style={{ display: "flex", gap: 8 }}>
        <button
          onClick={handleConfirm}
          disabled={confirming}
          style={{
            flex: 1,
            padding: "7px 12px",
            fontSize: 13,
            fontWeight: 600,
            cursor: confirming ? "wait" : "pointer",
            background: "#2563eb",
            color: "white",
            border: "none",
            borderRadius: 6
          }}>
          {confirming ? "Saving…" : "Confirm"}
        </button>
        <button
          onClick={handleCancel}
          disabled={confirming}
          style={{
            flex: 1,
            padding: "7px 12px",
            fontSize: 13,
            fontWeight: 600,
            cursor: confirming ? "default" : "pointer",
            background: "white",
            color: "#374151",
            border: "1px solid #d1d5db",
            borderRadius: 6
          }}>
          Cancel
        </button>
      </div>
    )

    // ── Screen 2: Full Edit ───────────────────────────────────────
    if (showFullEdit) {
      return (
        <div
          style={{ width: 300, fontFamily: "system-ui, -apple-system, sans-serif" }}>
          {topBar}
          <div style={{ padding: 16 }}>
            <button
              onClick={() => setShowFullEdit(false)}
              style={{
                fontSize: 12,
                color: "#6b7280",
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: 0,
                marginBottom: 10,
                display: "block"
              }}>
              ← Back
            </button>

            <div style={{ marginBottom: 6 }}>
              <label style={labelStyle}>Title</label>
              <input
                style={inputStyle}
                value={previewFields.title}
                onChange={(e) => updateField("title", e.target.value)}
              />
            </div>

            <div style={{ marginBottom: 6 }}>
              <label style={labelStyle}>Company</label>
              <input
                style={inputStyle}
                value={previewFields.company}
                onChange={(e) => updateField("company", e.target.value)}
              />
            </div>

            <div style={{ marginBottom: 6 }}>
              <label style={labelStyle}>Location</label>
              <input
                style={inputStyle}
                value={previewFields.location ?? ""}
                onChange={(e) =>
                  updateField("location", e.target.value || undefined)
                }
              />
            </div>

            <div style={{ display: "flex", gap: 8, marginBottom: 6 }}>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>Remote</label>
                <select
                  style={inputStyle}
                  value={previewFields.remoteType ?? ""}
                  onChange={(e) =>
                    updateField(
                      "remoteType",
                      (e.target.value as RemoteType) || undefined
                    )
                  }>
                  <option value="">—</option>
                  <option value="remote">remote</option>
                  <option value="hybrid">hybrid</option>
                  <option value="onsite">onsite</option>
                </select>
              </div>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>Job Type</label>
                <select
                  style={inputStyle}
                  value={previewFields.jobType ?? ""}
                  onChange={(e) =>
                    updateField(
                      "jobType",
                      (e.target.value as JobType) || undefined
                    )
                  }>
                  <option value="">—</option>
                  <option value="full-time">full-time</option>
                  <option value="part-time">part-time</option>
                  <option value="contract">contract</option>
                  <option value="internship">internship</option>
                  <option value="graduate">graduate</option>
                  <option value="fixed-term">fixed-term</option>
                  <option value="permanent">permanent</option>
                </select>
              </div>
            </div>

            <div style={{ marginBottom: 10 }}>
              <label style={labelStyle}>Salary</label>
              <div style={{ display: "flex", gap: 4 }}>
                <select
                  style={salarySelectStyle}
                  value={salaryCurrency}
                  onChange={(e) => {
                    const code = e.target.value
                    setSalaryCurrency(code)
                    updateField("salaryCurrency", code)
                  }}>
                  <option value="GBP">£ GBP</option>
                  <option value="USD">$ USD</option>
                  <option value="EUR">€ EUR</option>
                  <option value="SEK">kr SEK</option>
                </select>
                <input
                  style={{ ...inputStyle, flex: 1, width: "auto" }}
                  value={salaryRaw}
                  onKeyDown={salaryKeyDown}
                  onChange={(e) => {
                    const raw = e.target.value
                    setSalaryRaw(raw)
                    updateField("salaryRaw", raw || undefined)
                    if (raw) updateField("salaryCurrency", salaryCurrency)
                  }}
                />
              </div>
            </div>

            {confirmCancelRow}
          </div>
        </div>
      )
    }

    // ── Screen 1: Smart Preview ───────────────────────────────────
    return (
      <div
        style={{ width: 300, fontFamily: "system-ui, -apple-system, sans-serif" }}>
        {topBar}
        <div style={{ padding: 16 }}>
          <h1 style={{ fontSize: 15, fontWeight: 600, margin: "0 0 10px" }}>
            Review & Save
          </h1>

          {/* Read-only info block — initially extracted fields only */}
          {!initiallyMissingFields.has("title") && hasTitle && (
            <div style={{ marginBottom: 8 }}>
              <span style={infoLabel}>Title</span>
              <span style={infoValue}>{previewFields.title}</span>
            </div>
          )}
          {!initiallyMissingFields.has("company") && hasCompany && (
            <div style={{ marginBottom: 8 }}>
              <span style={infoLabel}>Company</span>
              <span style={infoValue}>{previewFields.company}</span>
            </div>
          )}
          {((!initiallyMissingFields.has("location") && hasLocation) || (!initiallyMissingFields.has("remoteType") && hasRemoteType)) && (
            <div style={{ display: "flex", gap: 12, marginBottom: 8 }}>
              {!initiallyMissingFields.has("location") && hasLocation && (
                <div style={{ flex: 1 }}>
                  <span style={infoLabel}>Location</span>
                  <span style={infoValue}>{previewFields.location}</span>
                </div>
              )}
              {!initiallyMissingFields.has("remoteType") && hasRemoteType && (
                <div style={{ flex: 1 }}>
                  <span style={infoLabel}>Remote</span>
                  <span style={infoValue}>{previewFields.remoteType}</span>
                </div>
              )}
            </div>
          )}
          {((!initiallyMissingFields.has("jobType") && hasJobType) || (!initiallyMissingFields.has("salaryRaw") && hasSalary)) && (
            <div style={{ display: "flex", gap: 12, marginBottom: 8 }}>
              {!initiallyMissingFields.has("jobType") && hasJobType && (
                <div style={{ flex: 1 }}>
                  <span style={infoLabel}>Job Type</span>
                  <span style={infoValue}>{previewFields.jobType}</span>
                </div>
              )}
              {!initiallyMissingFields.has("salaryRaw") && hasSalary && (
                <div style={{ flex: 1 }}>
                  <span style={infoLabel}>Salary</span>
                  <span style={infoValue}>{previewFields.salaryRaw}</span>
                </div>
              )}
            </div>
          )}

          {/* Editable inputs — shown only for fields that were missing at preview entry */}
          {initiallyMissingFields.has("title") && (
            <div style={{ marginBottom: 6 }}>
              <label style={labelStyle}>Title</label>
              <input
                style={inputStyle}
                value={previewFields.title}
                onChange={(e) => updateField("title", e.target.value)}
              />
            </div>
          )}
          {initiallyMissingFields.has("company") && (
            <div style={{ marginBottom: 6 }}>
              <label style={labelStyle}>Company</label>
              <input
                style={inputStyle}
                value={previewFields.company}
                onChange={(e) => updateField("company", e.target.value)}
              />
            </div>
          )}
          {initiallyMissingFields.has("location") && (
            <div style={{ marginBottom: 6 }}>
              <label style={labelStyle}>Location</label>
              <input
                style={inputStyle}
                value={previewFields.location ?? ""}
                onChange={(e) =>
                  updateField("location", e.target.value || undefined)
                }
              />
            </div>
          )}
          {initiallyMissingFields.has("remoteType") && (
            <div style={{ marginBottom: 6 }}>
              <label style={labelStyle}>Remote</label>
              <select
                style={inputStyle}
                value={previewFields.remoteType ?? ""}
                onChange={(e) =>
                  updateField(
                    "remoteType",
                    (e.target.value as RemoteType) || undefined
                  )
                }>
                <option value="">—</option>
                <option value="remote">remote</option>
                <option value="hybrid">hybrid</option>
                <option value="onsite">onsite</option>
              </select>
            </div>
          )}
          {initiallyMissingFields.has("jobType") && (
            <div style={{ marginBottom: 6 }}>
              <label style={labelStyle}>Job Type</label>
              <select
                style={inputStyle}
                value={previewFields.jobType ?? ""}
                onChange={(e) =>
                  updateField(
                    "jobType",
                    (e.target.value as JobType) || undefined
                  )
                }>
                <option value="">—</option>
                <option value="full-time">full-time</option>
                <option value="part-time">part-time</option>
                <option value="contract">contract</option>
                <option value="internship">internship</option>
                <option value="graduate">graduate</option>
                <option value="fixed-term">fixed-term</option>
                <option value="permanent">permanent</option>
              </select>
            </div>
          )}
          {initiallyMissingFields.has("salaryRaw") && (
            <div style={{ marginBottom: 6 }}>
              <label style={labelStyle}>Salary</label>
              <div style={{ display: "flex", gap: 4 }}>
                <select
                  style={salarySelectStyle}
                  value={salaryCurrency}
                  onChange={(e) => {
                    const code = e.target.value
                    setSalaryCurrency(code)
                    updateField("salaryCurrency", code)
                  }}>
                  <option value="GBP">£ GBP</option>
                  <option value="USD">$ USD</option>
                  <option value="EUR">€ EUR</option>
                  <option value="SEK">kr SEK</option>
                </select>
                <input
                  style={{ ...inputStyle, flex: 1, width: "auto" }}
                  value={salaryRaw}
                  onKeyDown={salaryKeyDown}
                  onChange={(e) => {
                    const raw = e.target.value
                    setSalaryRaw(raw)
                    updateField("salaryRaw", raw || undefined)
                    if (raw) updateField("salaryCurrency", salaryCurrency)
                  }}
                />
              </div>
            </div>
          )}

          {/* Edit all link — only when at least one field was extracted */}
          {anyExtracted && (
            <button
              onClick={() => setShowFullEdit(true)}
              style={{
                fontSize: 12,
                color: "#6b7280",
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: 0,
                marginTop: 4,
                marginBottom: 10,
                display: "block"
              }}>
              Edit all fields →
            </button>
          )}

          {confirmCancelRow}
        </div>
      </div>
    )
  }

  return (
    <div
      style={{
        width: 300,
        fontFamily: "system-ui, -apple-system, sans-serif"
      }}>
      {topBar}
      <div style={{ padding: 16 }}>
        <h1 style={{ fontSize: 16, margin: "0 0 12px" }}>Job Tracker</h1>
        <button
          onClick={handleSave}
          disabled={saveState.kind === "saving"}
          style={{
            width: "100%",
            padding: "8px 12px",
            fontSize: 14,
            fontWeight: 600,
            cursor: saveState.kind === "saving" ? "wait" : "pointer",
            background: "#2563eb",
            color: "white",
            border: "none",
            borderRadius: 6
          }}>
          {saveState.kind === "saving" ? "Saving…" : "Save Job"}
        </button>
        <div style={{ marginTop: 12, fontSize: 13, minHeight: 60 }}>
          {saveState.kind === "success" && (
            <div style={{ color: "#16a34a" }}>
              <div style={{ fontWeight: 600, marginBottom: 4 }}>✓ Saved</div>
              <div style={{ color: "#374151" }}>
                <div>
                  <strong>Title:</strong> {saveState.payload.title}
                </div>
                <div>
                  <strong>Company:</strong> {saveState.payload.company}
                </div>
              </div>
            </div>
          )}
          {saveState.kind === "error" && (
            <div style={{ color: "#dc2626" }}>{saveState.message}</div>
          )}
        </div>
      </div>
    </div>
  )
}

export default IndexPopup
