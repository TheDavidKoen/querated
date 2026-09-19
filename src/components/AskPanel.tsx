import type { FormEvent, KeyboardEvent, ReactNode, Ref } from "react";
import type { BuiltQuery, QueryOptions } from "@/lib/query-builder";
import { FieldPicker } from "./FieldPicker";
import { type DepartmentOption, FilterFields } from "./FilterFields";
import { QueryPreview } from "./QueryPreview";
import { SearchField } from "./SearchField";

type AskPanelProps = {
  options: QueryOptions;
  departments: DepartmentOption[];
  query: BuiltQuery;
  previewRef: Ref<HTMLDivElement>;
  busy: boolean;
  inFlight: boolean;
  problem: string | null;
  onChange: (update: Partial<QueryOptions>) => void;
  onSend: () => void;
};

const RAINBOW =
  "bg-linear-to-r from-syntax-keyword via-syntax-argument to-syntax-field bg-clip-text text-transparent";

function Step({ number, title, children }: { number: number; title: string; children: ReactNode }) {
  return (
    <section aria-labelledby={`step-${number}`} className="space-y-4">
      <div className="flex items-baseline gap-3">
        <span className="font-mono text-syntax-keyword text-xs">
          {String(number).padStart(2, "0")}
        </span>
        <h2 id={`step-${number}`} className="font-display text-ink-100 text-lg">
          {title}
        </h2>
      </div>
      {children}
    </section>
  );
}

export function AskPanel({
  options,
  departments,
  query,
  previewRef,
  busy,
  inFlight,
  problem,
  onChange,
  onSend,
}: AskPanelProps) {
  const submit = (event: FormEvent) => {
    event.preventDefault();
    onSend();
  };

  const submitWithShortcut = (event: KeyboardEvent<HTMLFormElement>) => {
    if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      onSend();
    }
  };

  return (
    <section
      aria-labelledby="ask-heading"
      className="studio-grid relative flex min-h-0 flex-col lg:h-dvh"
    >
      <form
        onSubmit={submit}
        onKeyDown={submitWithShortcut}
        className="flex min-h-0 flex-1 flex-col"
        aria-describedby="send-status"
      >
        <div className="flex-1 space-y-10 overflow-y-auto px-6 pt-8 pb-10 sm:px-10">
          <header>
            <h1
              id="ask-heading"
              className="font-display text-4xl text-ink-100 leading-[1.05] sm:text-5xl"
            >
              Ask the Met in <span className={RAINBOW}>Querated</span>.
            </h1>
            <p className="mt-4 max-w-md text-[15px] text-ink-300 leading-relaxed">
              Let's hunt for some art in the Met's <span className={RAINBOW}>gorgeous</span>{" "}
              catalogue.
            </p>
          </header>

          <Step number={1} title="Search">
            <SearchField value={options.search} onChange={(search) => onChange({ search })} />
          </Step>

          <Step number={2} title="Filter">
            <FilterFields options={options} departments={departments} onChange={onChange} />
          </Step>

          <Step number={3} title="Choose fields">
            <FieldPicker options={options} onChange={onChange} />
          </Step>

          <Step number={4} title="The query">
            <QueryPreview ref={previewRef} query={query} inFlight={inFlight} />
          </Step>
        </div>

        <div className="sticky bottom-0 z-10 flex items-center justify-between gap-4 border-ink-700 border-t bg-ink-950/90 px-6 py-4 backdrop-blur sm:px-10">
          <p
            id="send-status"
            className={`font-mono text-xs ${problem ? "text-signal-failed" : "text-ink-400"}`}
          >
            {problem ?? "One request, one endpoint. Ctrl + Enter sends."}
          </p>
          <button
            type="submit"
            disabled={busy || problem !== null}
            className="shrink-0 rounded-lg bg-linear-to-r from-syntax-keyword via-syntax-argument to-syntax-field px-5 py-2.5 font-semibold text-ink-950 text-sm shadow-lg shadow-syntax-keyword/20 transition-[filter,opacity] hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy ? "Sending..." : "Send query"}
          </button>
        </div>
      </form>
    </section>
  );
}
