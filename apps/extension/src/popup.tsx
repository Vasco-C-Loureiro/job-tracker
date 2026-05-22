import type {
  ExtractJobRequest,
  ExtractJobResponse,
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
  | { kind: "success"; payload: SaveJobPayload }
  | { kind: "error"; message: string }

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

    // Step 2 — validate token before POST
    const token = await getValidToken()
    console.log("[job-tracker] token:", token ? `${token.slice(0, 20)}…` : null)
    if (!token) {
      setSaveState({
        kind: "error",
        message: "Session expired — please sign in again"
      })
      setAuthError("Session expired — please sign in again.")
      setAuthState("signed-out")
      return
    }

    // Step 3 — POST the payload to the backend
    try {
      const apiResponse = await fetch(API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(response.payload)
      })

      console.log("[job-tracker] POST /api/jobs status:", apiResponse.status)

      if (apiResponse.status === 401) {
        console.log("[job-tracker] 401 received, clearing tokens")
        await clearTokens()
        setAuthError("Session expired — please sign in again.")
        setAuthState("signed-out")
        setSaveState({
          kind: "error",
          message: "Session expired — please sign in again."
        })
        return
      }

      if (!apiResponse.ok) {
        const errorBody = await apiResponse.json().catch(() => ({}))
        setSaveState({
          kind: "error",
          message: errorBody.error ?? `Save failed (${apiResponse.status})`
        })
        return
      }

      console.log("[job-tracker] 201 success")
      setSaveState({ kind: "success", payload: response.payload })
    } catch {
      setSaveState({
        kind: "error",
        message: "Couldn't reach the backend. Is the dev server running?"
      })
    }
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

  return (
    <div
      style={{
        width: 300,
        fontFamily: "system-ui, -apple-system, sans-serif"
      }}>
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
