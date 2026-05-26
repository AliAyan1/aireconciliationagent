import { ImageResponse } from "next/og";
import { OG_COLORS } from "@/lib/og-branding";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: OG_COLORS.bg,
          fontSize: 20,
          fontWeight: 800,
          color: OG_COLORS.accent,
          letterSpacing: "-0.04em",
        }}
      >
        H.
      </div>
    ),
    { ...size }
  );
}
