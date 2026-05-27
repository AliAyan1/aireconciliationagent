"use client";

import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import {
  loadAutoSaveMinutes,
  saveAutoSaveMinutes,
} from "@/lib/auto-save";
import {
  loadRetentionPolicy,
  saveRetentionPolicy,
  type RetentionPolicy,
} from "@/lib/data-retention";
import {
  loadScheduledExport,
  saveScheduledExport,
  type ScheduledExportSettings,
} from "@/lib/scheduled-export";
import {
  ACCENT_PRESETS,
  CURRENCY_OPTIONS,
  DATE_FORMAT_OPTIONS,
  loadDisplayPreferences,
  saveDisplayPreferences,
} from "@/lib/display-preferences";
import {
  BUILTIN_MATCHING_PROFILES,
  estimateAiCostPkr,
  loadActiveProfileId,
  loadMatchingConfig,
  saveMatchingConfig,
  applyMatchingProfile,
  type MatchingConfig,
} from "@/lib/matching-config";
import { getAIScoringCandidates } from "@/lib/matcher";
import type { BankTransaction, LedgerEntry, MatchResult } from "@/lib/types";

interface MatchingSettingsPanelProps {
  results?: MatchResult[];
  bankData?: BankTransaction[];
  ledgerData?: LedgerEntry[];
  onRematchComplete?: (
    results: MatchResult[],
    summary: import("@/lib/types").ReconciliationSummary
  ) => void;
  onResetTable?: () => void;
}

export function MatchingSettingsPanel({
  results = [],
  bankData = [],
  ledgerData = [],
  onRematchComplete,
  onResetTable,
}: MatchingSettingsPanelProps) {
  const [config, setConfig] = useState<MatchingConfig>(() => loadMatchingConfig());
  const [profileId, setProfileId] = useState<string | null>(null);
  const [display, setDisplay] = useState(() => loadDisplayPreferences());
  const [autoSaveMin, setAutoSaveMin] = useState(5);
  const [retention, setRetention] = useState<RetentionPolicy>("30");
  const [schedule, setSchedule] = useState<ScheduledExportSettings>({
    enabled: false,
    dayOfMonth: 1,
    lastExportAt: null,
  });
  const [rematching, setRematching] = useState(false);
  const [blacklistText, setBlacklistText] = useState("");

  useEffect(() => {
    const c = loadMatchingConfig();
    setConfig(c);
    setProfileId(loadActiveProfileId());
    setBlacklistText(c.keywordBlacklist.join(", "));
    setDisplay(loadDisplayPreferences());
    setAutoSaveMin(loadAutoSaveMinutes());
    setRetention(loadRetentionPolicy());
    setSchedule(loadScheduledExport());
  }, []);

  const aiEstimate = useMemo(() => {
    const count = getAIScoringCandidates(results, config).length;
    return estimateAiCostPkr(count, config.aiBatchSize);
  }, [results, config]);

  function persistConfig(next: MatchingConfig) {
    setConfig(next);
    saveMatchingConfig(next);
  }

  function update<K extends keyof MatchingConfig>(key: K, value: MatchingConfig[K]) {
    persistConfig({ ...config, [key]: value });
  }

  async function rematch() {
    if (!bankData.length || !ledgerData.length) {
      toast.error("No session data — upload files first");
      return;
    }
    setRematching(true);
    try {
      const res = await fetch("/api/match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bankData,
          ledgerData,
          matchingConfig: config,
        }),
      });
      if (!res.ok) {
        const err = (await res.json()) as { error?: string };
        throw new Error(err.error ?? "Rematch failed");
      }
      const data = await res.json();
      onRematchComplete?.(data.results, data.summary);
      toast.success("Matching re-run with new settings");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Rematch failed");
    } finally {
      setRematching(false);
    }
  }

  function saveBlacklist() {
    const words = blacklistText
      .split(/[,;\n]+/)
      .map((w) => w.trim().toUpperCase())
      .filter(Boolean);
    persistConfig({ ...config, keywordBlacklist: words });
    toast.success("Keyword blacklist updated");
  }

  return (
    <div className="space-y-8 max-w-2xl">
      <section className="glass-card p-5 space-y-4">
        <h3 className="text-sm font-semibold text-primary">Matching profiles</h3>
        <p className="text-xs text-muted">
          Apply a preset before upload or re-run matching on the current session.
        </p>
        <div className="flex flex-wrap gap-2">
          {BUILTIN_MATCHING_PROFILES.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => {
                const c = applyMatchingProfile(p.id);
                if (c) {
                  setConfig(c);
                  setProfileId(p.id);
                  setBlacklistText(c.keywordBlacklist.join(", "));
                }
              }}
              className={`rounded-lg border px-3 py-2 text-xs transition ${
                profileId === p.id
                  ? "border-[var(--accent)] bg-[rgba(56,189,248,0.12)] text-accent"
                  : "border-default text-secondary hover:border-hover"
              }`}
            >
              {p.name}
            </button>
          ))}
        </div>
      </section>

      <section className="glass-card p-5 space-y-5">
        <h3 className="text-sm font-semibold text-primary">Matching rules</h3>

        <label className="block text-sm text-secondary">
          Date tolerance: ±{config.dateToleranceDays} day
          {config.dateToleranceDays === 1 ? "" : "s"}
          <input
            type="range"
            min={1}
            max={5}
            value={config.dateToleranceDays}
            onChange={(e) =>
              update("dateToleranceDays", Number(e.target.value))
            }
            className="mt-2 w-full accent-[var(--accent)]"
          />
        </label>

        <label className="block text-sm text-secondary">
          Amount tolerance: ±{config.amountTolerancePkr.toLocaleString()} PKR
          <input
            type="range"
            min={100}
            max={5000}
            step={100}
            value={config.amountTolerancePkr}
            onChange={(e) =>
              update("amountTolerancePkr", Number(e.target.value))
            }
            className="mt-2 w-full accent-[var(--accent)]"
          />
        </label>

        <label className="block text-sm text-secondary">
          Auto-approve threshold: {config.autoApproveThreshold}%
          <input
            type="range"
            min={80}
            max={99}
            value={config.autoApproveThreshold}
            onChange={(e) =>
              update("autoApproveThreshold", Number(e.target.value))
            }
            className="mt-2 w-full accent-[var(--accent)]"
          />
        </label>

        <div>
          <p className="text-sm text-secondary mb-2">Auto-approve by phase (%)</p>
          <div className="grid grid-cols-2 gap-3 text-xs">
            {(
              [
                ["exact", "Exact"],
                ["near", "Near"],
                ["fuzzy", "Fuzzy"],
                ["ai", "AI"],
              ] as const
            ).map(([key, label]) => (
              <label key={key} className="text-secondary">
                {label}
                <input
                  type="number"
                  min={70}
                  max={100}
                  value={config.phaseThresholds[key]}
                  onChange={(e) =>
                    persistConfig({
                      ...config,
                      phaseThresholds: {
                        ...config.phaseThresholds,
                        [key]: Number(e.target.value),
                      },
                    })
                  }
                  className="input-field mt-0.5 w-full px-2 py-1"
                />
              </label>
            ))}
          </div>
        </div>

        <div>
          <label className="text-sm text-secondary">
            Description noise words (comma-separated)
          </label>
          <textarea
            value={blacklistText}
            onChange={(e) => setBlacklistText(e.target.value)}
            onBlur={saveBlacklist}
            rows={3}
            className="input-field mt-1 w-full px-3 py-2 text-sm"
            placeholder="PAYMENT, TRANSFER, ONLINE"
          />
        </div>

        <label className="flex items-center gap-2 text-sm text-secondary">
          <input
            type="checkbox"
            checked={config.enableAiScoring}
            onChange={(e) => update("enableAiScoring", e.target.checked)}
          />
          Enable AI fuzzy matching
        </label>

        {config.enableAiScoring && (
          <label className="block text-sm text-secondary">
            AI batch size: {config.aiBatchSize} pairs per API call
            <input
              type="range"
              min={5}
              max={25}
              value={config.aiBatchSize}
              onChange={(e) => update("aiBatchSize", Number(e.target.value))}
              className="mt-2 w-full accent-[var(--accent)]"
            />
            <p className="text-xs text-muted mt-1">
              ~{aiEstimate.batches} batch(es) for current session · est. $
              {aiEstimate.estimatedUsd.toFixed(3)} USD
            </p>
          </label>
        )}

        <button
          type="button"
          disabled={rematching || !bankData.length}
          onClick={() => void rematch()}
          className="btn-primary w-full py-2.5 text-sm disabled:opacity-50"
        >
          {rematching ? "Re-running match…" : "Re-run matching with these settings"}
        </button>
      </section>

      <section className="glass-card p-5 space-y-4">
        <h3 className="text-sm font-semibold text-primary">Display</h3>
        <label className="block text-sm text-secondary">
          Currency
          <select
            value={display.currency}
            onChange={(e) => {
              const currency = e.target.value as typeof display.currency;
              saveDisplayPreferences({ currency });
              setDisplay(loadDisplayPreferences());
            }}
            className="input-field mt-1 w-full px-3 py-2 text-sm"
          >
            {CURRENCY_OPTIONS.map((o) => (
              <option key={o.code} value={o.code}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm text-secondary">
          Date format
          <select
            value={display.dateFormat}
            onChange={(e) => {
              saveDisplayPreferences({
                dateFormat: e.target.value as typeof display.dateFormat,
              });
              setDisplay(loadDisplayPreferences());
            }}
            className="input-field mt-1 w-full px-3 py-2 text-sm"
          >
            {DATE_FORMAT_OPTIONS.map((o) => (
              <option key={o.id} value={o.id}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
        <div>
          <p className="text-sm text-secondary mb-2">Accent color</p>
          <div className="flex flex-wrap gap-2">
            {Object.entries(ACCENT_PRESETS).map(([id, preset]) => (
              <button
                key={id}
                type="button"
                title={preset.label}
                onClick={() => {
                  saveDisplayPreferences({ accentPreset: id });
                  setDisplay(loadDisplayPreferences());
                }}
                className={`h-8 w-8 rounded-full border-2 ${
                  display.accentPreset === id
                    ? "border-white scale-110"
                    : "border-transparent"
                }`}
                style={{ background: preset.accent }}
              />
            ))}
          </div>
        </div>
      </section>

      <section className="glass-card p-5 space-y-3">
        <h3 className="text-sm font-semibold text-primary">Auto-save</h3>
        <label className="block text-sm text-secondary">
          Auto-save session every {autoSaveMin || "—"} minutes (0 = off)
          <input
            type="range"
            min={0}
            max={30}
            value={autoSaveMin}
            onChange={(e) => {
              const v = Number(e.target.value);
              setAutoSaveMin(v);
              saveAutoSaveMinutes(v);
            }}
            className="mt-2 w-full accent-[var(--accent)]"
          />
        </label>
      </section>

      <section className="glass-card p-5 space-y-3">
        <h3 className="text-sm font-semibold text-primary">Data retention</h3>
        <select
          value={retention}
          onChange={(e) => {
            const v = e.target.value as RetentionPolicy;
            setRetention(v);
            saveRetentionPolicy(v);
          }}
          className="input-field w-full max-w-xs px-3 py-2 text-sm"
        >
          <option value="7">Auto-delete after 7 days</option>
          <option value="30">Auto-delete after 30 days</option>
          <option value="never">Never</option>
        </select>
      </section>

      <section className="glass-card p-5 space-y-3">
        <h3 className="text-sm font-semibold text-primary">Scheduled export</h3>
        <label className="flex items-center gap-2 text-sm text-secondary">
          <input
            type="checkbox"
            checked={schedule.enabled}
            onChange={(e) => {
              const next = { ...schedule, enabled: e.target.checked };
              setSchedule(next);
              saveScheduledExport(next);
            }}
          />
          Monthly export reminder
        </label>
      </section>

      {onResetTable && (
        <section className="glass-card p-5">
          <h3 className="text-sm font-medium text-primary">Table layout</h3>
          <button
            type="button"
            onClick={onResetTable}
            className="btn-ghost mt-3 text-sm"
          >
            Reset table layout
          </button>
        </section>
      )}
    </div>
  );
}
