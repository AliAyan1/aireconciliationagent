import { formatFileIntegrityLine } from "@/lib/audit-certificate";

interface FileIntegrityCardProps {
  bankFileName?: string;
  bankFileHash?: string;
  ledgerFileName?: string;
  ledgerFileHash?: string;
}

export function FileIntegrityCard({
  bankFileName = "bank_statement.csv",
  bankFileHash,
  ledgerFileName = "ledger.csv",
  ledgerFileHash,
}: FileIntegrityCardProps) {
  if (!bankFileHash && !ledgerFileHash) return null;

  return (
    <div className="mt-6 glass-card p-4 border-l-[3px] border-l-sky-500/70">
      <p className="text-sm font-semibold text-primary mb-2">
        File integrity (SHA-256)
      </p>
      <ul className="text-xs text-secondary space-y-1 font-mono">
        {bankFileHash ? (
          <li>
            {formatFileIntegrityLine("Bank file", bankFileHash)}
            <span className="text-muted font-sans ml-2">({bankFileName})</span>
          </li>
        ) : null}
        {ledgerFileHash ? (
          <li>
            {formatFileIntegrityLine("Ledger file", ledgerFileHash)}
            <span className="text-muted font-sans ml-2">({ledgerFileName})</span>
          </li>
        ) : null}
      </ul>
      <p className="mt-2 text-[11px] text-muted">
        Hashes are included in exported reports to prove files were not tampered
        with.
      </p>
    </div>
  );
}
