"use client";

import { useMemo, useState } from "react";
import toast from "react-hot-toast";
import {
  detectColumnMapping,
  loadColumnMappingTemplates,
  saveColumnMappingTemplate,
  type ColumnField,
  type ColumnMapping,
} from "@/lib/column-mapping";
import { parseCsvTable } from "@/lib/normalizer";

const BANK_FIELDS: ColumnField[] = [
  "date",
  "description",
  "amount",
  "debit",
  "credit",
  "balance",
  "reference",
];

const LEDGER_FIELDS: ColumnField[] = [
  "date",
  "description",
  "amount",
  "type",
  "reference",
  "invoiceNo",
];

interface ColumnMapperPanelProps {
  source: "bank" | "ledger";
  csvText: string | null;
  mapping: ColumnMapping;
  onMappingChange: (mapping: ColumnMapping) => void;
}

export function ColumnMapperPanel({
  source,
  csvText,
  mapping,
  onMappingChange,
}: ColumnMapperPanelProps) {
  const [templateName, setTemplateName] = useState("");

  const headers = useMemo(() => {
    if (!csvText) return [];
    const { data } = parseCsvTable(csvText);
    return Object.keys(data[0] ?? {});
  }, [csvText]);

  const fields = source === "bank" ? BANK_FIELDS : LEDGER_FIELDS;

  if (!csvText || headers.length === 0) return null;

  function autoDetect() {
    const detected = detectColumnMapping(headers);
    onMappingChange({ ...mapping, ...detected });
    toast.success("Columns auto-detected");
  }

  function saveTemplate() {
    const name = templateName.trim() || `${source} mapping`;
    saveColumnMappingTemplate({
      id: `tpl-${Date.now()}`,
      name,
      source,
      mapping,
    });
    setTemplateName("");
    toast.success("Column mapping saved");
  }

  const templates = loadColumnMappingTemplates(source);

  return (
    <div className="mt-3 rounded-lg border border-default bg-input/40 p-3 text-left">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
        <p className="text-xs font-semibold text-primary">Column mapping</p>
        <button
          type="button"
          className="text-xs text-accent hover:underline"
          onClick={autoDetect}
        >
          Auto-detect
        </button>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        {fields.map((field) => (
          <label key={field} className="text-xs text-secondary">
            {field}
            <select
              value={mapping[field] ?? ""}
              onChange={(e) =>
                onMappingChange({
                  ...mapping,
                  [field]: e.target.value || undefined,
                })
              }
              className="input-field mt-0.5 w-full px-2 py-1 text-xs block"
            >
              <option value="">—</option>
              {headers.map((h) => (
                <option key={h} value={h}>
                  {h}
                </option>
              ))}
            </select>
          </label>
        ))}
      </div>
      <div className="mt-3 flex flex-wrap gap-2 items-center">
        <input
          type="text"
          placeholder="Template name"
          value={templateName}
          onChange={(e) => setTemplateName(e.target.value)}
          className="input-field flex-1 min-w-[8rem] px-2 py-1 text-xs"
        />
        <button type="button" className="btn-ghost text-xs px-2 py-1" onClick={saveTemplate}>
          Save template
        </button>
        {templates.length > 0 && (
          <select
            className="input-field px-2 py-1 text-xs"
            defaultValue=""
            onChange={(e) => {
              const t = templates.find((x) => x.id === e.target.value);
              if (t) onMappingChange(t.mapping);
            }}
          >
            <option value="">Load template…</option>
            {templates.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        )}
      </div>
    </div>
  );
}
