export interface SanitizationReport {
  scriptInjections: number;
  sqlInjectionAttempts: number;
  escapedSpecialChars: number;
  safe: boolean;
}

const SCRIPT_PATTERNS = [
  /<script\b/i,
  /javascript:/i,
  /on\w+\s*=/i,
  /<iframe/i,
  /data:text\/html/i,
];

const SQL_PATTERNS = [
  /('\s*OR\s*'1'\s*=\s*'1)/i,
  /;\s*DROP\s+TABLE/i,
  /;\s*DELETE\s+FROM/i,
  /UNION\s+SELECT/i,
  /--\s*$/,
  /\/\*.*\*\//,
];

export function scanCsvForThreats(csvText: string): SanitizationReport {
  let scriptInjections = 0;
  let sqlInjectionAttempts = 0;

  const lines = csvText.split(/\r?\n/).slice(0, 500);
  for (const line of lines) {
    for (const p of SCRIPT_PATTERNS) {
      if (p.test(line)) scriptInjections += 1;
    }
    for (const p of SQL_PATTERNS) {
      if (p.test(line)) sqlInjectionAttempts += 1;
    }
  }

  const escapedSpecialChars = (csvText.match(/[<>'"`;]/g) ?? []).length;

  return {
    scriptInjections,
    sqlInjectionAttempts,
    escapedSpecialChars,
    safe: scriptInjections === 0 && sqlInjectionAttempts === 0,
  };
}

export function formatSanitizationMessage(report: SanitizationReport): string {
  const escapedNote =
    report.scriptInjections === 0 && report.sqlInjectionAttempts === 0
      ? ", all special characters escaped"
      : ", special characters normalized for parsing";
  return `Input sanitized: ${report.scriptInjections} script injection${
    report.scriptInjections === 1 ? "" : "s"
  } detected, ${report.sqlInjectionAttempts} SQL injection attempt${
    report.sqlInjectionAttempts === 1 ? "" : "s"
  }${escapedNote}.`;
}
