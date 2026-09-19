import type { Ref } from "react";
import { GRAPHQL_ENDPOINT } from "@/lib/contract";
import type { BuiltQuery, TokenKind } from "@/lib/query-builder";

const TOKEN_CLASS: Record<TokenKind, string> = {
  keyword: "text-syntax-keyword",
  operation: "text-syntax-operation",
  variable: "text-syntax-variable",
  type: "text-syntax-type",
  field: "text-syntax-field",
  argument: "text-syntax-argument",
  enum: "text-syntax-enum",
  number: "text-syntax-number",
  punctuation: "text-syntax-punctuation",
};

type QueryPreviewProps = {
  ref?: Ref<HTMLDivElement>;
  query: BuiltQuery;
  inFlight: boolean;
};

export function QueryPreview({ ref, query, inFlight }: QueryPreviewProps) {
  const variables = JSON.stringify(query.variables, null, 2).split("\n");

  return (
    <div
      ref={ref}
      className={`rounded-xl border border-ink-700 bg-ink-900/90 shadow-2xl shadow-black/40 transition-opacity duration-300 ${inFlight ? "opacity-40" : "opacity-100"}`}
    >
      <div className="flex items-center justify-between gap-3 border-ink-700 border-b px-4 py-2.5 font-mono text-xs">
        <span>
          <span className="text-syntax-keyword">POST</span>{" "}
          <span className="text-ink-100">{GRAPHQL_ENDPOINT}</span>
        </span>
        <span className="text-ink-400">application/json</span>
      </div>

      <pre className="overflow-x-auto px-4 py-3 font-mono text-[13px] leading-[1.6]">
        <code>
          {query.lines.map((line) => (
            <span key={line.key} className="block whitespace-pre">
              {"  ".repeat(line.depth)}
              {line.tokens.map((token) => (
                <span
                  key={token.key}
                  data-token={token.text.trim() ? "" : undefined}
                  className={TOKEN_CLASS[token.kind]}
                >
                  {token.text}
                </span>
              ))}
            </span>
          ))}
        </code>
      </pre>

      <div className="border-ink-700 border-t px-4 py-3">
        <p className="mb-1.5 font-mono text-[11px] text-ink-400 uppercase tracking-[0.18em]">
          Variables
        </p>
        <pre className="overflow-x-auto font-mono text-[13px] text-syntax-variable leading-[1.6]">
          <code>
            {variables.map((line) => (
              <span key={line} data-token="" className="block whitespace-pre">
                {line}
              </span>
            ))}
          </code>
        </pre>
      </div>
    </div>
  );
}
