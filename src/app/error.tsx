"use client";

export default function ErrorPage({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="studio-grid grid min-h-dvh place-items-center px-6">
      <div className="max-w-md space-y-4 text-center">
        <p className="font-mono text-signal-failed text-sm">Error</p>
        <h1 className="font-display text-4xl text-ink-100">The studio stumbled</h1>
        <p className="text-ink-300">Something failed while rendering this page. Try again.</p>
        <button
          type="button"
          onClick={reset}
          className="rounded-lg border border-ink-600 px-4 py-2 font-mono text-ink-100 text-sm hover:border-syntax-field"
        >
          Try again
        </button>
      </div>
    </main>
  );
}
