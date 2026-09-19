// Performance budget and client-bundle guards, run against `next build` output. The numbers here
// and in docs/performance.md are one fact stored twice; change both together.

import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { gzipSync } from "node:zlib";

const KB = 1024;
const BUDGET = {
  initialJs: 210 * KB,
  lazyJs: 150 * KB,
  css: 12 * KB,
  latinFonts: 90 * KB,
};

const NEXT = ".next";
const STATIC = join(NEXT, "static");

// Each guard names what must never reach a browser and why.
const GUARDS = [
  {
    finds: "collectionapi.metmuseum.org",
    reason: "contains the Met API host: server code has leaked into the client bundle",
  },
  {
    finds: "//# sourceMappingURL=",
    reason: "references a source map: production browser source maps must stay off",
  },
];

function fail(message: string): never {
  console.error(`budget: ${message}`);
  process.exit(1);
}

function files(directory: string): string[] {
  return readdirSync(directory).flatMap((entry) => {
    const path = join(directory, entry);
    return statSync(path).isDirectory() ? files(path) : [path];
  });
}

const gzipped = (path: string) => gzipSync(readFileSync(path)).byteLength;
const sum = (paths: Iterable<string>) =>
  [...paths].reduce((total, path) => total + gzipped(path), 0);
const kb = (bytes: number) => `${(bytes / KB).toFixed(1)} KB`;

// A page in English downloads only the @font-face blocks whose unicode-range covers Basic Latin.
function latinFontFiles(stylesheet: string): string[] {
  return readFileSync(stylesheet, "utf8")
    .split("@font-face")
    .slice(1)
    .map((block) => block.slice(0, block.indexOf("}")))
    .filter((face) => /U\+(0000-00FF|\?\?)[,;\s]/i.test(`${face};`))
    .flatMap((face) => face.match(/url\(["']?[^"')]*\/media\/([^"')]+\.woff2)/)?.[1] ?? [])
    .map((file) => join(STATIC, "media", file));
}

if (!existsSync(STATIC)) fail("no build output, run `pnpm build` first");

const buildManifest = JSON.parse(readFileSync(join(NEXT, "build-manifest.json"), "utf8")) as {
  rootMainFiles: string[];
  polyfillFiles: string[];
};
const clientManifest = readFileSync(
  join(NEXT, "server/app/page_client-reference-manifest.js"),
  "utf8",
);
const manifestJson = clientManifest.match(/\] = (\{[\s\S]*\});?\s*$/)?.[1];
if (!manifestJson) fail("could not read the page client reference manifest");
const { entryJSFiles } = JSON.parse(manifestJson) as { entryJSFiles: Record<string, string[]> };

// Everything the home page's HTML asks a modern browser for. Polyfills are served as nomodule.
const initial = new Set(
  [...buildManifest.rootMainFiles, ...Object.values(entryJSFiles).flat()].map((file) =>
    join(NEXT, file),
  ),
);
const polyfills = new Set(buildManifest.polyfillFiles.map((file) => join(NEXT, file)));

const all = files(STATIC);
const scripts = all.filter((path) => path.endsWith(".js") && !polyfills.has(path));
const styles = all.filter((path) => path.endsWith(".css"));
const lazy = scripts.filter(
  (path) => !initial.has(path) && path.includes(join("static", "chunks")),
);
const fonts = new Set(styles.flatMap(latinFontFiles));

const results = (
  [
    ["initialJs", sum(initial)],
    ["lazyJs", sum(lazy)],
    ["css", sum(styles)],
    ["latinFonts", [...fonts].reduce((total, path) => total + statSync(path).size, 0)],
  ] as const
).map(([bucket, bytes]) => ({ bucket, bytes, limit: BUDGET[bucket] }));

for (const { bucket, bytes, limit } of results) {
  const verdict = bytes > limit ? "OVER" : "ok";
  console.log(
    `${bucket.padEnd(11)} ${kb(bytes).padStart(10)} of ${kb(limit).padStart(10)}  ${verdict}`,
  );
}

const leaks = scripts.flatMap((path) => {
  const source = readFileSync(path, "utf8");
  return GUARDS.filter(({ finds }) => source.includes(finds)).map(
    ({ reason }) => `${path} ${reason}`,
  );
});
if (leaks.length > 0) fail(leaks.join("\n"));
if (all.some((path) => /\.env/.test(path))) fail("an env file was copied into the static output");
if (results.some(({ bytes, limit }) => bytes > limit)) fail("over budget, see docs/performance.md");

console.log("budget: within budget, client bundle clean");
