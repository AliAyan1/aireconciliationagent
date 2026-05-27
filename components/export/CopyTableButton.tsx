"use client";

import toast from "react-hot-toast";
import { copyResultsToClipboard } from "@/lib/clipboard-export";
import type { MatchResult } from "@/lib/types";

export function CopyTableButton({
  results,
  className = "",
}: {
  results: MatchResult[];
  className?: string;
}) {
  return (
    <button
      type="button"
      className={`btn-ghost text-xs px-2 py-1 ${className}`}
      onClick={() => {
        void copyResultsToClipboard(results).then((ok) => {
          if (ok) toast.success(`Copied ${results.length} rows to clipboard`);
          else toast.error("Could not copy to clipboard");
        });
      }}
      disabled={!results.length}
    >
      Copy table
    </button>
  );
}
