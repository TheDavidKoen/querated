import { ImageResponse } from "next/og";

export const alt = "Ask the Met in Querated";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const LINES: Array<Array<[string, string]>> = [
  [
    ["query ", "#ff5cc8"],
    ["SearchArtworks", "#ffe066"],
    ["($search: ", "#8e8eae"],
    ["String!", "#7cf29c"],
    [") {", "#8e8eae"],
  ],
  [
    ["  artworks", "#5cd6ff"],
    ["(", "#8e8eae"],
    ["search", "#ffb454"],
    [": ", "#8e8eae"],
    ["$search", "#b69cff"],
    [") {", "#8e8eae"],
  ],
  [["    items { title image artist { name } }", "#5cd6ff"]],
  [["  }", "#8e8eae"]],
  [["}", "#8e8eae"]],
];

// The primary mark from the brand pack: ink studio left, lit wall right, two pictures hung.
function Mark() {
  return (
    <svg width="128" height="88" viewBox="0 0 128 88" role="img" aria-label="Querated">
      <rect x="2" y="2" width="62" height="84" fill="#0e0e1a" />
      <rect x="64" y="2" width="62" height="84" fill="#f3eee4" />
      <rect x="14" y="22" width="34" height="8" rx="4" fill="#ff5cc8" />
      <rect x="14" y="38" width="22" height="8" rx="4" fill="#5cd6ff" />
      <rect x="14" y="54" width="28" height="8" rx="4" fill="#ffb454" />
      <rect x="74" y="22" width="24" height="30" fill="none" stroke="#585042" strokeWidth="5" />
      <rect x="104" y="22" width="16" height="21" fill="none" stroke="#585042" strokeWidth="5" />
      <rect
        x="2"
        y="2"
        width="124"
        height="84"
        rx="4"
        fill="none"
        stroke="#e8e8f5"
        strokeOpacity="0.32"
        strokeWidth="3"
      />
    </svg>
  );
}

export default function OpengraphImage() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: 72,
        background: "#07070d",
        color: "#e8e8f5",
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
          <Mark />
          <div style={{ fontSize: 28, letterSpacing: 8, color: "#8585a6" }}>QUERATED</div>
        </div>
        <div style={{ fontSize: 76, fontWeight: 700, lineHeight: 1.05 }}>
          Ask the Met in Querated.
        </div>
      </div>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          padding: "28px 32px",
          borderRadius: 18,
          border: "2px solid #24243b",
          background: "#0e0e1a",
          fontSize: 30,
          fontFamily: "monospace",
        }}
      >
        {LINES.map((line) => (
          <div
            key={line.map(([text]) => text).join("")}
            style={{ display: "flex", whiteSpace: "pre" }}
          >
            {line.map(([text, colour]) => (
              <span key={text} style={{ color: colour }}>
                {text}
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>,
    size,
  );
}
