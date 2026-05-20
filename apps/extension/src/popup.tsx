import { useState } from "react";

import type {
  ExtractJobRequest,
  ExtractJobResponse,
  SaveJobPayload
} from "@job-tracker/shared";

type State =
  | { kind: "idle" }
  | { kind: "saving" }
  | { kind: "success"; payload: SaveJobPayload }
  | { kind: "error"; message: string };

function IndexPopup() {
  const [state, setState] = useState<State>({ kind: "idle" });

  const handleSave = async () => {
    setState({ kind: "saving" });

    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true
    });

    if (!tab?.id) {
      setState({ kind: "error", message: "No active tab found." });
      return;
    }

    const request: ExtractJobRequest = { type: "EXTRACT_JOB" };

    let response: ExtractJobResponse;
    try {
      response = await chrome.tabs.sendMessage(tab.id, request);
    } catch {
      // No content script registered on this page — not a supported site.
      setState({
        kind: "error",
        message: "This page isn't supported yet. Open an Indeed job listing."
      });
      return;
    }

    if (response.ok) {
      // v0.1 stub: log the payload, real save comes in unit 4.
      console.log("[Job Tracker] Extracted payload:", response.payload);
      setState({ kind: "success", payload: response.payload });
    } else {
      setState({
        kind: "error",
        message:
          response.reason === "extraction-failed"
            ? "Couldn't find a job on this page."
            : "Page not supported."
      });
    }
  };

  return (
    <div
      style={{
        width: 300,
        padding: 16,
        fontFamily: "system-ui, -apple-system, sans-serif"
      }}
    >
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
        }}
      >
        {state.kind === "saving" ? "Saving…" : "Save Job"}
      </button>

      <div style={{ marginTop: 12, fontSize: 13, minHeight: 60 }}>
        {state.kind === "success" && (
          <div style={{ color: "#16a34a" }}>
            <div style={{ fontWeight: 600, marginBottom: 4 }}>
              ✓ Extracted (stub — not saved yet)
            </div>
            <div style={{ color: "#374151" }}>
              <div>
                <strong>Title:</strong> {state.payload.title}
              </div>
              <div>
                <strong>Company:</strong> {state.payload.company}
              </div>
            </div>
            <div style={{ marginTop: 6, color: "#6b7280", fontSize: 11 }}>
              Full payload logged to the popup's DevTools console.
            </div>
          </div>
        )}
        {state.kind === "error" && (
          <div style={{ color: "#dc2626" }}>{state.message}</div>
        )}
      </div>
    </div>
  );
}

export default IndexPopup;
