export function DataPrivacyBanner() {
  return (
    <div
      className="glass-card border-l-[3px] border-l-emerald-500/80 p-4 mb-8 text-sm text-secondary"
      role="note"
      aria-label="Data privacy"
    >
      <p className="font-medium text-primary mb-1">
        🔒 Your files are processed in-browser
      </p>
      <p className="leading-relaxed">
        Data is sent to our server for matching but never stored permanently.
        OpenAI receives only transaction descriptions, not amounts or personal
        info.
      </p>
    </div>
  );
}
