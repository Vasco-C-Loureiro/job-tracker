"use client";

import React, { useRef, useState, useEffect } from "react";
import Papa from "papaparse";
import { Upload, CheckCircle2 } from "lucide-react";
import type { ImportWizardState } from "../types";
import { detectHeaderRow } from "../utils";

type FileUploadProps = {
  state: ImportWizardState;
  onUpdate: React.Dispatch<React.SetStateAction<ImportWizardState>>;
};

type Substate = "idle" | "loading" | "success";

export function FileUpload({ state, onUpdate }: FileUploadProps) {
  const [substate, setSubstate] = useState<Substate>("idle");
  const [showTable, setShowTable] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dragCounter = useRef(0);
  const [isDragOver, setIsDragOver] = useState(false);

  useEffect(() => {
    if (substate === "success") {
      const id = setTimeout(() => setShowTable(true), 50);
      return () => clearTimeout(id);
    } else {
      setTimeout(() => setShowTable(false), 0);
    }
  }, [substate]);

  function parseFile(file: File) {
    setSubstate("loading");
    const start = Date.now();
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const result = Papa.parse<string[]>(text, {
        header: false,
        skipEmptyLines: true,
      });
      const rows = result.data;
      const headerIdx = detectHeaderRow(rows);
      const elapsed = Date.now() - start;
      const delay = Math.max(0, 400 - elapsed);
      setTimeout(() => {
        onUpdate((s) => ({
          ...s,
          file,
          csvHeaders: rows[headerIdx] ?? [],
          rawRows: rows,
          headerRowIndex: headerIdx,
          selectedRowIndices: new Set(rows.map((_, i) => i).filter(i => i > headerIdx)),
        }));
        setSubstate("success");
      }, delay);
    };
    reader.readAsText(file);
  }

  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) parseFile(file);
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
  }

  function handleDragEnter(e: React.DragEvent) {
    e.preventDefault();
    dragCounter.current++;
    setIsDragOver(true);
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault();
    dragCounter.current--;
    if (dragCounter.current === 0) setIsDragOver(false);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    dragCounter.current = 0;
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) parseFile(file);
  }

  const previewHeaders = state.csvHeaders;
  const previewRows = state.rawRows.slice(state.headerRowIndex + 1, state.headerRowIndex + 4);

  return (
    <div className="max-w-2xl mx-auto mt-16 px-4">
      <input
        ref={inputRef}
        type="file"
        accept=".csv"
        className="hidden"
        onChange={handleFileInput}
      />

      {substate === "idle" && (
        <div
          onClick={() => inputRef.current?.click()}
          onDragOver={handleDragOver}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-xl p-16 text-center cursor-pointer transition-colors ${
            isDragOver
              ? "border-blue-400 bg-blue-50"
              : "border-gray-300 hover:border-gray-400"
          }`}
        >
          <Upload className="mx-auto mb-4 text-gray-400" size={48} />
          <h2 className="text-xl font-semibold text-gray-800 mb-2">
            Drop your CSV here
          </h2>
          <p className="text-sm text-gray-500">
            or click to browse &mdash; exported from Excel, Google Sheets, or
            any spreadsheet app
          </p>
        </div>
      )}

      {substate === "loading" && (
        <div className="border-2 border-dashed border-gray-300 rounded-xl p-16 text-center">
          <div className="mx-auto mb-4 w-12 h-12 rounded-full border-4 border-gray-200 border-t-blue-500 animate-spin" />
          <p className="text-sm text-gray-500">Reading file&hellip;</p>
        </div>
      )}

      {substate === "success" && (
        <div>
          <div className="text-center mb-6">
            <CheckCircle2 className="mx-auto mb-3 text-green-500" size={48} />
            <p className="text-lg font-semibold text-gray-800">
              {state.file?.name}
            </p>
            <p className="text-sm text-gray-500 mt-1">
              {state.rawRows.length - state.headerRowIndex - 1} rows detected
            </p>
          </div>

          {/* CSV preview table with animated reveal */}
          <div
            className={`overflow-hidden transition-all duration-500 ${
              showTable ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
            }`}
          >
            <div className="relative overflow-x-auto rounded-lg border border-gray-200">
              <table className="w-full text-sm text-left">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    {previewHeaders.map((h) => (
                      <th
                        key={h}
                        className="px-3 py-2 font-medium text-gray-700 whitespace-nowrap"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {previewRows.map((row, i) => (
                    <tr
                      key={i}
                      className="border-b border-gray-100 last:border-0"
                    >
                      {previewHeaders.map((h, colIdx) => (
                        <td
                          key={h}
                          className="px-3 py-2 text-gray-700 whitespace-nowrap max-w-[200px] truncate"
                        >
                          {row[colIdx] ?? ""}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              {/* Gradient fade over the bottom of the table */}
              <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-white to-transparent" />
            </div>
          </div>

          <button
            onClick={() => onUpdate((s) => ({ ...s, step: "toggle-fields" }))}
            className="mt-6 w-full py-3 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition-colors"
          >
            Begin setup &rarr;
          </button>
        </div>
      )}
    </div>
  );
}
