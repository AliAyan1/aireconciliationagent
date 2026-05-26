import { ImageResponse } from "next/og";
import { APP_NAME, APP_TAGLINE } from "@/lib/branding";
import { OG_COLORS } from "@/lib/og-branding";

export const alt = `${APP_NAME} — ${APP_TAGLINE}`;
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
            H.
          </div>
          <span
            style={{
              fontSize: 56,
              fontWeight: 800,
              color: OG_COLORS.text,
              letterSpacing: "-0.03em",
            }}
          >
            <span style={{ color: OG_COLORS.accent }}>Hisaab</span>
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
          {APP_TAGLINE}
        </p>
        <div
          style={{
            display: "flex",
            gap: 32,
            marginTop: 48,
            fontSize: 22,
            color: OG_COLORS.accent,
          }}
        >
          <span>Bank ↔ Ledger matching</span>
          <span>·</span>
          <span>AI confidence scores</span>
          <span>·</span>
          <span>Audit-ready exports</span>
        </div>
      </div>
    ),
    { ...size }
  );
}
