import type { FilterCheck, SearchDiagnosis } from "@/lib/graphql-client";
import type { QueryVariables } from "@/lib/query-builder";
import type { DepartmentOption } from "./FilterFields";

type EmptyResultProps = {
  total: number;
  failedCalls: number;
  diagnosis: SearchDiagnosis | null | undefined;
  variables: QueryVariables;
  departments: DepartmentOption[];
  onClear: (argumentNames: string[]) => void;
};

const works = (count: number) =>
  `${count.toLocaleString("en-GB")} ${count === 1 ? "work" : "works"}`;

function listed(names: string[]): string {
  if (names.length <= 1) return names.join("");
  return `${names.slice(0, -1).join(", ")} and ${names.at(-1)}`;
}

function Argument({
  name,
  variables,
  departments,
}: {
  name: string;
  variables: QueryVariables;
  departments: DepartmentOption[];
}) {
  const value = variables[name as keyof QueryVariables];
  const department =
    name === "departmentId" ? departments.find((entry) => entry.id === value)?.name : undefined;
  return (
    <span className="inline-flex flex-wrap items-baseline gap-x-2">
      <code className="rounded bg-wall-900 px-1.5 py-0.5 font-mono text-[12px] text-syntax-argument">
        {name}: {JSON.stringify(value)}
      </code>
      {department && <span className="text-sm text-wall-700">{department}</span>}
    </span>
  );
}

function verdict(check: FilterCheck, searchAlone: number): { tone: string; text: string } {
  if (check.matchesAlone === 0) {
    return {
      tone: "border-red-300 bg-red-50 text-red-900",
      text: `Rules out all ${works(searchAlone)} on its own.`,
    };
  }
  if (check.matchesWithout > 0) {
    return {
      tone: "border-emerald-300 bg-emerald-50 text-emerald-900",
      text: `Allows ${works(check.matchesAlone)} on its own. Remove it and ${works(check.matchesWithout)} match.`,
    };
  }
  return {
    tone: "border-wall-300 bg-wall-100 text-wall-900",
    text: `Allows ${works(check.matchesAlone)} on its own, but another filter still rules them out.`,
  };
}

function headline(diagnosis: SearchDiagnosis): string {
  const culprits = diagnosis.filters.filter((check) => check.matchesAlone === 0);
  if (culprits.length > 0) {
    const names = listed(culprits.map((check) => check.arguments.join(" and ")));
    return culprits.length === 1
      ? `${names} rules out every one of them.`
      : `${names} each rule out every one of them on their own.`;
  }
  if (diagnosis.filters.some((check) => check.matchesWithout > 0)) {
    return "No single filter rules everything out. Together they do.";
  }
  return "Every filter allows some works, but they clash in combination. Clearing one is not enough.";
}

// Explains a gallery with no works, using the diagnosis field when the query asked for it.
export function EmptyResult({
  total,
  failedCalls,
  diagnosis,
  variables,
  departments,
  onClear,
}: EmptyResultProps) {
  if (total > 0 && failedCalls > 0) {
    return (
      <p className="max-w-lg text-wall-700 leading-relaxed">
        The Met's search matched {works(total)}, but the Met refused or did not answer{" "}
        {failedCalls === 1 ? "one call" : `${failedCalls} calls`} for their details. Try again in a
        minute.
      </p>
    );
  }

  if (total > 0) {
    return (
      <p className="max-w-lg text-wall-700 leading-relaxed">
        The Met's search matched {works(total)}, but none of those checked shows your search in its
        title, subjects or artist with an Open Access image. The Met also searches text it does not
        publish, and withholds many images for rights reasons. Try a broader word.
      </p>
    );
  }

  if (diagnosis === undefined) {
    return (
      <p className="max-w-lg text-wall-700 leading-relaxed">
        No works matched. Tick <strong>Explain an empty result</strong> and send again to see which
        filter ruled them out.
      </p>
    );
  }

  if (diagnosis === null || (diagnosis.searchAlone === 0 && !variables.search)) {
    return <p className="max-w-lg text-wall-700 leading-relaxed">No works matched.</p>;
  }

  if (diagnosis.searchAlone === 0) {
    return (
      <div className="max-w-2xl space-y-3">
        <h3 className="font-display text-2xl">Why nothing matched</h3>
        <p className="text-wall-700 leading-relaxed">
          <Argument name="search" variables={variables} departments={departments} /> finds nothing
          in the collection, before any filter is applied. Try another word or a different spelling.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-5">
      <div className="space-y-2">
        <h3 className="font-display text-2xl">Why nothing matched</h3>
        <p className="text-wall-700 leading-relaxed">
          {variables.search ? (
            <>
              <Argument name="search" variables={variables} departments={departments} /> finds{" "}
              {works(diagnosis.searchAlone)} on its own.
            </>
          ) : (
            <>With no search term, the whole collection offers {works(diagnosis.searchAlone)}.</>
          )}{" "}
          {headline(diagnosis)}
        </p>
      </div>

      <ul className="space-y-3">
        {diagnosis.filters.map((check) => {
          const { tone, text } = verdict(check, diagnosis.searchAlone);
          return (
            <li key={check.arguments.join()} className={`rounded-lg border p-4 ${tone}`}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap gap-2">
                  {check.arguments.map((name) => (
                    <Argument
                      key={name}
                      name={name}
                      variables={variables}
                      departments={departments}
                    />
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => onClear(check.arguments)}
                  className="rounded-md border border-current px-3 py-1 font-mono text-xs hover:bg-white/60"
                >
                  Clear and send again
                </button>
              </div>
              <p className="mt-2 text-sm">{text}</p>
              <p className="mt-1 font-mono text-[11px] opacity-80">
                matchesAlone {check.matchesAlone} / matchesWithout {check.matchesWithout}
              </p>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
