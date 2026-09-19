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
        <div style={{ fontSize: 28, letterSpacing: 8, color: "#8585a6" }}>QUERATED</div>
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
