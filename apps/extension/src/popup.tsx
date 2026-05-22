import type {
  ExtractJobRequest,
  ExtractJobResponse,
  SaveJobPayload
} from "@job-tracker/shared"
import { useState } from "react"

const API_URL = "http://localhost:3000/api/jobs"

type State =
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
  const [state, setState] = useState<State>({ kind: "idle" })

  const handleSave = async () => {
    setState({ kind: "saving" })

    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true
    })

    if (!tab?.id) {
      setState({ kind: "error", message: "No active tab found." })
      return
    }

    // Step 1 — ask the content script to extract the job
    const response = await sendExtractMessage(tab.id)
    if (response === null) {
      setState({
        kind: "error",
        message: "This page isn't supported yet. Open an Indeed job listing."
      })
      return
    }

    if ("reason" in response) {
      setState({
        kind: "error",
        message:
          response.reason === "extraction-failed"
            ? "Couldn't find a job on this page."
            : "Page not supported."
      })
      return
    }

    // Step 2 — POST the payload to the backend
    try {
      const apiResponse = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(response.payload)
      })

      if (!apiResponse.ok) {
        const errorBody = await apiResponse.json().catch(() => ({}))
        setState({
          kind: "error",
          message: errorBody.error ?? `Save failed (${apiResponse.status})`
        })
        return
      }

      setState({ kind: "success", payload: response.payload })
    } catch {
      setState({
        kind: "error",
        message: "Couldn't reach the backend. Is the dev server running?"
      })
    }
  }

  return (
    <div
      style={{
        width: 300,
        padding: 16,
        fontFamily: "system-ui, -apple-system, sans-serif"
      }}>
      <h1 style={{ fontSize: 16, margin: "0 0 12px" }}>Job Tracker</h1>
      <button
        onClick={handleSave}
        disabled={state.kind === "saving"}
        style={{
          width: "100%",
          padding: "8px 12px",
          fontSize: 14,
          fontWeight: 600,
          cursor: state.kind === "saving" ? "wait" : "pointer",
          background: "#2563eb",
          color: "white",
          border: "none",
          borderRadius: 6
        }}>
        {state.kind === "saving" ? "Saving…" : "Save Job"}
      </button>
      <div style={{ marginTop: 12, fontSize: 13, minHeight: 60 }}>
        {state.kind === "success" && (
          <div style={{ color: "#16a34a" }}>
            <div style={{ fontWeight: 600, marginBottom: 4 }}>✓ Saved</div>
            <div style={{ color: "#374151" }}>
              <div>
                <strong>Title:</strong> {state.payload.title}
              </div>
              <div>
                <strong>Company:</strong> {state.payload.company}
              </div>
            </div>
          </div>
        )}
        {state.kind === "error" && (
          <div style={{ color: "#dc2626" }}>{state.message}</div>
        )}
      </div>
    </div>
  )
}

export default IndexPopup
