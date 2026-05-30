"use client";

import { useState } from "react";
import type { ImportWizardState } from "./types";
import { WizardShell } from "./WizardShell";
import { ImportHistory } from "./ImportHistory";
import { initialState } from "./initialState";

export { initialState };

export default function CsvImport() {
  const [state, setState] = useState<ImportWizardState>(initialState);
  return (
    <>
      <WizardShell state={state} onUpdate={setState} />
      {state.step === "upload" && (
        <div className="mt-12">
          <ImportHistory />
        </div>
      )}
    </>
  );
}
