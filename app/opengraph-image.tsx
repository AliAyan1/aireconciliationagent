import { ImageResponse } from "@vercel/og";
import { OG_COLORS } from "@/lib/og-branding";

export const alt = "Hisab.ai — AI Reconciliation";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "72px 80px",
          background: `linear-gradient(145deg, ${OG_COLORS.bg} 0%, #0c1222 45%, #111a2e 100%)`,
          border: `2px solid ${OG_COLORS.border}`,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
            marginBottom: 28,
          }}
        >
          <div
            style={{
              width: 72,
              height: 72,
              borderRadius: 16,
              background: OG_COLORS.bg,
              border: `2px solid ${OG_COLORS.border}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 40,
              fontWeight: 800,
              color: OG_COLORS.accent,
            }}
          >
            H
          </div>
          <span
            style={{
              fontSize: 56,
              fontWeight: 800,
              color: OG_COLORS.text,
              letterSpacing: "-0.03em",
            }}
          >
            <span style={{ color: OG_COLORS.accent }}>Hisab</span>
            <span style={{ color: OG_COLORS.text }}>.ai</span>
          </span>
        </div>
        <p
          style={{
            fontSize: 32,
            lineHeight: 1.35,
            color: OG_COLORS.muted,
            maxWidth: 900,
            margin: 0,
          }}
        >
          Reconcile transactions in seconds, not hours.
        </p>
        <div
          style={{
            display: "flex",
            gap: 32,
            marginTop: 48,
            fontSize: 22,
            color: OG_COLORS.accent,
            flexWrap: "wrap",
          }}
        >
          <span>4–6 hrs → 30 sec</span>
          <span>·</span>
          <span>97%+ accuracy</span>
          <span>·</span>
          <span>Audit trail included</span>
        </div>
      </div>
    ),
    { ...size }
  );
}
