import {
  ARTIST_FIELDS,
  ARTWORK_FIELDS,
  type ArtistField,
  type ArtworkField,
  type QueryOptions,
} from "@/lib/query-builder";

type FieldPickerProps = {
  options: QueryOptions;
  onChange: (update: Partial<QueryOptions>) => void;
};

function toggle<T>(list: readonly T[], item: T, on: boolean): T[] {
  return on ? [...list, item] : list.filter((entry) => entry !== item);
}

const checkboxClass = "size-4 shrink-0 accent-syntax-field disabled:opacity-50";
const legendClass = "mb-3 font-mono text-[11px] text-ink-400 uppercase tracking-[0.18em]";
const rowClass = "flex cursor-pointer items-center gap-3 text-ink-300 text-sm";

export function FieldPicker({ options, onChange }: FieldPickerProps) {
  return (
    <div className="grid gap-6 sm:grid-cols-2">
      <fieldset>
        <legend className={legendClass}>Artwork</legend>
        <div className="space-y-2.5">
          <label className={`${rowClass} cursor-default`}>
            <input type="checkbox" checked disabled className={checkboxClass} />
            Title <span className="text-ink-400 text-xs">(always)</span>
          </label>
          {ARTWORK_FIELDS.map((field) => (
            <label key={field.key} className={rowClass}>
              <input
                type="checkbox"
                checked={options.artworkFields.includes(field.key)}
                onChange={(event) =>
                  onChange({
                    artworkFields: toggle<ArtworkField>(
                      options.artworkFields,
                      field.key,
                      event.target.checked,
                    ),
                  })
                }
                className={checkboxClass}
              />
              {field.label}
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend className={legendClass}>Artist</legend>
        <div className="space-y-2.5">
          <label className={rowClass}>
            <input
              type="checkbox"
              checked={options.includeArtist}
              onChange={(event) =>
                onChange({
                  includeArtist: event.target.checked,
                  includeOtherWorks: event.target.checked && options.includeOtherWorks,
                })
              }
              className={checkboxClass}
            />
            Name
          </label>
          {ARTIST_FIELDS.map((field) => (
            <label key={field.key} className={rowClass}>
              <input
                type="checkbox"
                disabled={!options.includeArtist}
                checked={options.includeArtist && options.artistFields.includes(field.key)}
                onChange={(event) =>
                  onChange({
                    artistFields: toggle<ArtistField>(
                      options.artistFields,
                      field.key,
                      event.target.checked,
                    ),
                  })
                }
                className={checkboxClass}
              />
              {field.label}
            </label>
          ))}
          <label className={`${rowClass} items-start`}>
            <input
              type="checkbox"
              checked={options.includeOtherWorks}
              onChange={(event) =>
                onChange({
                  includeOtherWorks: event.target.checked,
                  includeArtist: event.target.checked || options.includeArtist,
                })
              }
              className={`${checkboxClass} mt-0.5`}
            />
            <span>
              Other works by the artist
              <span className="mt-0.5 block text-ink-400 text-xs">
                One extra search per artist. Watch the call count.
              </span>
            </span>
          </label>
        </div>
      </fieldset>

      <fieldset className="sm:col-span-2">
        <legend className={legendClass}>Results</legend>
        <label className={`${rowClass} items-start`}>
          <input
            type="checkbox"
            checked={options.explainEmpty}
            onChange={(event) => onChange({ explainEmpty: event.target.checked })}
            className={`${checkboxClass} mt-0.5`}
          />
          <span>
            Explain an empty result
            <span className="mt-0.5 block text-ink-400 text-xs">
              Costs nothing unless nothing matches. Then one extra search per filter combination.
            </span>
          </span>
        </label>
      </fieldset>
    </div>
  );
}
