import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

// The favicon's split room, redrawn full bleed: iOS rounds the corners itself.
export default function AppleIcon() {
  return new ImageResponse(
    <svg width="180" height="180" viewBox="12 12 104 104" role="img" aria-label="Querated">
      <rect x="12" y="12" width="52" height="104" fill="#0e0e1a" />
      <rect x="64" y="12" width="52" height="104" fill="#f3eee4" />
      <rect x="22" y="44" width="32" height="10" rx="5" fill="#ff5cc8" />
      <rect x="22" y="62" width="22" height="10" rx="5" fill="#5cd6ff" />
      <rect x="76" y="40" width="28" height="36" fill="none" stroke="#585042" strokeWidth="6" />
    </svg>,
    size,
  );
}
