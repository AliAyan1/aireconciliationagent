import { APP_LOGO_PARTS } from "@/lib/branding";

const sizeClass = {
  sm: "text-lg",
  md: "text-xl",
  lg: "text-2xl",
} as const;

export function BrandLogo({
  size = "md",
  className = "",
}: {
  size?: keyof typeof sizeClass;
  className?: string;
}) {
  const [wordmark, suffix] = APP_LOGO_PARTS;
  return (
    <span
      className={`inline-flex items-baseline font-extrabold tracking-tight ${sizeClass[size]} ${className}`}
      style={{ fontWeight: 800 }}
    >
      <span style={{ color: "var(--logo-wordmark)" }}>{wordmark}</span>
      <span style={{ color: "var(--logo-suffix)" }}>{suffix}</span>
    </span>
  );
}
