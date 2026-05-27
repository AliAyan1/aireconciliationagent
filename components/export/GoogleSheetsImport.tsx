"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import { fetchGoogleSheetCsv } from "@/lib/google-sheets";

interface GoogleSheetsImportProps {
  label: string;
  onCsv: (csv: string, suggestedName: string) => void;
}

export function GoogleSheetsImport({ label, onCsv }: GoogleSheetsImportProps) {
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);

  async function importSheet() {
    setLoading(true);
    try {
      const csv = await fetchGoogleSheetCsv(url);
      onCsv(csv, "google_sheet.csv");
      toast.success(`${label}: sheet imported`);
      setOpen(false);
      setUrl("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Import failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-2 text-xs text-accent hover:underline"
      >
        Import from Google Sheets
      </button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(5,10,18,0.6)] p-4">
          <div className="card-surface max-w-md w-full p-5">
            <p className="text-sm font-semibold text-primary mb-2">
              {label} — Google Sheets
            </p>
            <p className="text-xs text-muted mb-3">
              Paste a share link. The sheet must be viewable by anyone with the
              link.
            </p>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://docs.google.com/spreadsheets/d/..."
              className="input-field w-full px-3 py-2 text-sm mb-4"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                className="btn-ghost text-sm px-3 py-1.5"
                onClick={() => setOpen(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn-primary text-sm px-3 py-1.5"
                disabled={!url.trim() || loading}
                onClick={() => void importSheet()}
              >
                {loading ? "Importing…" : "Import"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
