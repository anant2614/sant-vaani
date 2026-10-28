'use client';

export default function StudioError({ error, retry }: { error: unknown; retry: () => void }) {
  const digest = error instanceof Error && 'digest' in error ? String(error.digest) : null;
  return (
    <div className="card">
      <h2>This page could not load</h2>
      <p className="muted">
        The database or YouTube did not answer as expected. Try again; if it keeps happening, send the reference below
        to whoever runs the studio.
      </p>
      {digest ? <p className="muted">Reference: {digest}</p> : null}
      <button type="button" onClick={() => retry()}>
        Try again
      </button>
    </div>
  );
}
