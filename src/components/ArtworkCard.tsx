import Image from "next/image";
import { formatYear } from "@/lib/format";
import type { ArtistResult, ArtworkResult } from "@/lib/graphql-client";

// Wall label rows in museum order. A row renders only when its field came back in the response,
// which is what makes the card take the shape of the query.
const LABEL_FIELDS = [
  "date",
  "medium",
  "dimensions",
  "culture",
  "department",
  "creditLine",
] as const;

function lifespan(artist: ArtistResult): string | null {
  if (!("born" in artist) && !("died" in artist)) return null;
  const born = artist.born == null ? "?" : formatYear(artist.born);
  const died = artist.died == null ? "" : formatYear(artist.died);
  return `${born}–${died}`;
}

function ExternalLink({ href, children }: { href: string; children: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 font-mono text-[11px] text-wall-700 uppercase tracking-wider underline decoration-wall-300 underline-offset-4 hover:text-wall-900 hover:decoration-wall-900"
    >
      {children}
      <svg viewBox="0 0 10 10" aria-hidden="true" className="size-2.5">
        <path d="M2 8 8 2M3.5 2H8v4.5" fill="none" stroke="currentColor" strokeWidth="1.4" />
      </svg>
      <span className="sr-only">(opens in a new tab)</span>
    </a>
  );
}

function OtherWorks({ works, artist }: { works: ArtworkResult[]; artist: string }) {
  if (works.length === 0) {
    return <p className="text-wall-600 text-xs">No other works with an Open Access image.</p>;
  }
  return (
    <ul className="grid grid-cols-3 gap-2">
      {works.map((work) => (
        <li key={work.id}>
          <a
            href={work.url ?? "#"}
            target="_blank"
            rel="noopener noreferrer"
            title={work.title}
            className="relative block aspect-square overflow-hidden rounded-sm bg-wall-100 ring-1 ring-wall-200"
          >
            {work.image && (
              <Image
                src={work.image}
                alt={`${work.title}, ${artist}`}
                fill
                sizes="96px"
                unoptimized
                referrerPolicy="no-referrer"
                className="object-cover"
              />
            )}
            <span className="sr-only">(opens in a new tab)</span>
          </a>
        </li>
      ))}
    </ul>
  );
}

export function ArtworkCard({ artwork }: { artwork: ArtworkResult }) {
  const artist = artwork.artist ?? null;
  const rows = [
    ...LABEL_FIELDS.flatMap((key) => {
      const value = artwork[key];
      return typeof value === "string" ? [{ key, value }] : [];
    }),
    ...(artwork.tags?.length ? [{ key: "tags", value: artwork.tags.join(", ") }] : []),
  ];
  const artistRows = artist
    ? [
        { key: "nationality", value: artist.nationality ?? null },
        { key: "born, died", value: lifespan(artist) },
        { key: "bio", value: artist.bio ?? null },
      ].filter((row): row is { key: string; value: string } => typeof row.value === "string")
    : [];

  return (
    <article className="artwork-card flex flex-col rounded-sm bg-white p-3 shadow-[0_1px_2px_rgb(38_34_25/0.08),0_16px_36px_-16px_rgb(38_34_25/0.35)] ring-1 ring-wall-200">
      {"image" in artwork && (
        <div className="relative aspect-4/5 overflow-hidden bg-wall-100">
          {artwork.image ? (
            <Image
              src={artwork.image}
              alt={artist ? `${artwork.title}, ${artist.name}` : artwork.title}
              fill
              sizes="(min-width: 1536px) 22vw, (min-width: 1024px) 28vw, (min-width: 640px) 45vw, 90vw"
              unoptimized
              referrerPolicy="no-referrer"
              className="object-contain p-3"
            />
          ) : (
            <p className="absolute inset-0 grid place-items-center p-6 text-center text-sm text-wall-600">
              No Open Access image
            </p>
          )}
        </div>
      )}

      <div className="flex flex-1 flex-col gap-3 px-1 pt-4 pb-1">
        <div>
          <h3 className="font-display text-lg text-wall-900 leading-snug">{artwork.title}</h3>
          {artist && <p className="mt-1 text-sm text-wall-700 italic">{artist.name}</p>}
        </div>

        {rows.length + artistRows.length > 0 && (
          <dl className="space-y-1.5 text-[13px]">
            {[...rows, ...artistRows].map((row) => (
              <div key={row.key} className="grid grid-cols-[5.75rem_1fr] gap-2">
                <dt className="pt-0.5 font-mono text-[10.5px] text-wall-600 uppercase tracking-wider">
                  {row.key}
                </dt>
                <dd className="text-wall-900">{row.value}</dd>
              </div>
            ))}
          </dl>
        )}

        {artist?.otherWorks && (
          <div className="space-y-2">
            <p className="font-mono text-[10.5px] text-wall-600 uppercase tracking-wider">
              otherWorks
            </p>
            <OtherWorks works={artist.otherWorks} artist={artist.name} />
          </div>
        )}

        {artwork.url && (
          <div className="mt-auto pt-2">
            <ExternalLink href={artwork.url}>View at the Met</ExternalLink>
          </div>
        )}
      </div>
    </article>
  );
}
