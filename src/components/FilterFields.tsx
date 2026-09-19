import type { ReactNode } from "react";
import { EARLIEST_YEAR, latestYear, RESULT_COUNTS } from "@/lib/contract";
import type { QueryOptions } from "@/lib/query-builder";

export type DepartmentOption = { id: number; name: string };

type FilterFieldsProps = {
  options: QueryOptions;
  departments: DepartmentOption[];
  onChange: (update: Partial<QueryOptions>) => void;
};

const inputClass =
  "w-full rounded-lg border border-ink-600 bg-ink-900 px-3 py-2 text-sm text-ink-100 placeholder:text-ink-400 focus:border-syntax-argument focus:outline-none";

function ArgumentName({ children }: { children: ReactNode }) {
  return <code className="font-mono text-syntax-argument text-xs">{children}</code>;
}

function parseYear(value: string): number | null {
  const year = Number.parseInt(value, 10);
  return Number.isNaN(year) ? null : year;
}

function YearInput({
  name,
  label,
  value,
  onChange,
}: {
  name: "from" | "to";
  label: string;
  value: number | null;
  onChange: (year: number | null) => void;
}) {
  return (
    <div>
      <label htmlFor={name} className="mb-1.5 block text-ink-300 text-sm">
        {label} <ArgumentName>{name}</ArgumentName>
      </label>
      <input
        id={name}
        type="number"
        inputMode="numeric"
        min={EARLIEST_YEAR}
        max={latestYear()}
        placeholder="Any"
        value={value ?? ""}
        onChange={(event) => onChange(parseYear(event.target.value))}
        aria-describedby="year-hint"
        className={inputClass}
      />
    </div>
  );
}

export function FilterFields({ options, departments, onChange }: FilterFieldsProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <label htmlFor="department" className="mb-1.5 block text-ink-300 text-sm">
          Department <ArgumentName>departmentId</ArgumentName>
        </label>
        <select
          id="department"
          value={options.departmentId ?? ""}
          onChange={(event) =>
            onChange({ departmentId: event.target.value ? Number(event.target.value) : null })
          }
          className={inputClass}
        >
          <option value="">Every department</option>
          {departments.map((department) => (
            <option key={department.id} value={department.id}>
              {department.name}
            </option>
          ))}
        </select>
      </div>

      <YearInput
        name="from"
        label="From year"
        value={options.from}
        onChange={(from) => onChange({ from })}
      />
      <YearInput name="to" label="To year" value={options.to} onChange={(to) => onChange({ to })} />
      <p id="year-hint" className="-mt-2 text-ink-400 text-xs sm:col-span-2">
        Negative years are BCE, so -500 means 500 BCE.
      </p>

      <label className="flex cursor-pointer items-center gap-3 text-ink-300 text-sm sm:col-span-2">
        <input
          type="checkbox"
          checked={options.highlightsOnly}
          onChange={(event) => onChange({ highlightsOnly: event.target.checked })}
          className="size-4 accent-syntax-argument"
        />
        Highlights only <ArgumentName>highlightsOnly</ArgumentName>
      </label>

      <fieldset className="sm:col-span-2">
        <legend className="mb-2 text-ink-300 text-sm">
          Works per page <ArgumentName>first</ArgumentName>
        </legend>
        <div className="inline-flex rounded-lg border border-ink-600 p-1">
          {RESULT_COUNTS.map((count) => (
            <label
              key={count}
              className="cursor-pointer rounded-md px-4 py-1.5 font-mono text-ink-300 text-sm has-checked:bg-syntax-argument has-checked:text-ink-950 has-focus-visible:outline-2 has-focus-visible:outline-syntax-field"
            >
              <input
                type="radio"
                name="first"
                value={count}
                checked={options.first === count}
                onChange={() => onChange({ first: count })}
                className="sr-only"
              />
              {count}
            </label>
          ))}
        </div>
      </fieldset>
    </div>
  );
}
