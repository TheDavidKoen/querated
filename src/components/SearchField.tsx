import { SEARCH_MAX_LENGTH } from "@/lib/contract";

const SUGGESTIONS = ["sunflowers", "armor", "Hokusai", "cats", "Rembrandt", "tea bowl", "Monet"];

type SearchFieldProps = {
  value: string;
  onChange: (value: string) => void;
};

export function SearchField({ value, onChange }: SearchFieldProps) {
  return (
    <div className="space-y-3">
      <label htmlFor="search" className="sr-only">
        Search the collection
      </label>
      <input
        id="search"
        name="search"
        type="search"
        maxLength={SEARCH_MAX_LENGTH}
        autoComplete="off"
        spellCheck={false}
        placeholder="Leave empty for all art references."
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-lg border border-ink-600 bg-ink-900 px-4 py-3 text-base text-ink-100 placeholder:text-ink-400 focus:border-syntax-field focus:outline-none"
      />
      <fieldset className="flex flex-wrap gap-2">
        <legend className="sr-only">Suggested searches</legend>
        {SUGGESTIONS.map((suggestion) => (
          <button
            key={suggestion}
            type="button"
            aria-pressed={value.trim().toLowerCase() === suggestion.toLowerCase()}
            onClick={() => onChange(suggestion)}
            className="rounded-full border border-ink-600 px-3 py-1 font-mono text-ink-300 text-xs transition-colors hover:border-syntax-field hover:text-ink-100 aria-pressed:border-syntax-field aria-pressed:bg-syntax-field/10 aria-pressed:text-syntax-field"
          >
            {suggestion}
          </button>
        ))}
      </fieldset>
    </div>
  );
}
