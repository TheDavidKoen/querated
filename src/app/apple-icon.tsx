import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#07070d",
      }}
    >
      <svg width="132" height="132" viewBox="0 0 64 64" role="img" aria-label="Querated">
        <defs>
          <linearGradient id="q" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#ff5cc8" />
            <stop offset="0.5" stopColor="#ffb454" />
            <stop offset="1" stopColor="#5cd6ff" />
          </linearGradient>
        </defs>
        <rect
          x="11"
          y="11"
          width="36"
          height="36"
          rx="3"
          fill="none"
          stroke="url(#q)"
          strokeWidth="5"
        />
        <path d="M39 39 L54 54" stroke="url(#q)" strokeWidth="5" strokeLinecap="round" />
      </svg>
    </div>,
    size,
  );
}
