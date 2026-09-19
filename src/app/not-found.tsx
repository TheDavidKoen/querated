import Link from "next/link";

export const metadata = { title: "Not found" };

export default function NotFound() {
  return (
    <main className="studio-grid grid min-h-dvh place-items-center px-6">
      <div className="max-w-md space-y-4 text-center">
        <p className="font-mono text-syntax-keyword text-sm">404</p>
        <h1 className="font-display text-4xl text-ink-100">Nothing hangs here</h1>
        <p className="text-ink-300">That page is not part of the collection.</p>
        <Link
          href="/"
          className="inline-block rounded-lg border border-ink-600 px-4 py-2 font-mono text-ink-100 text-sm hover:border-syntax-field"
        >
          Back to the studio
        </Link>
      </div>
    </main>
  );
}
