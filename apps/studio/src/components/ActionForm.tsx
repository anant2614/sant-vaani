'use client';

import { useActionState, useEffect, useRef, startTransition, type ReactNode } from 'react';
import type { ActionState } from '@/lib/actions';

type Props = {
  action: (state: ActionState, data: FormData) => Promise<ActionState>;
  children: ReactNode;
  className?: string;
  /** Clear the fields after a save that reported no error. */
  resetOnSuccess?: boolean;
  /** Ask before running, for steps that are hard to undo. */
  confirm?: string;
};

/**
 * A form for a server action that shows the action's error or notice.
 * Fields keep what was typed when the action fails, and the whole form
 * is disabled while it runs.
 */
export function ActionForm({ action, children, className, resetOnSuccess, confirm }: Props) {
  const [state, dispatch, pending] = useActionState(action, {});
  const form = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (resetOnSuccess && state.notice && !state.error) form.current?.reset();
  }, [state, resetOnSuccess]);

  return (
    <form
      ref={form}
      className={className}
      action={dispatch}
      onSubmit={(event) => {
        // Submitting by hand keeps the fields; a plain form action would clear them.
        event.preventDefault();
        if (confirm && !window.confirm(confirm)) return;
        const submitter = (event.nativeEvent as SubmitEvent).submitter;
        const data = new FormData(event.currentTarget, submitter);
        startTransition(() => dispatch(data));
      }}
    >
      <fieldset className="form-body" disabled={pending}>
        {children}
      </fieldset>
      {state.error ? (
        <p role="alert" className="form-error">
          {state.error}
        </p>
      ) : null}
      {state.notice && !state.error ? (
        <p role="status" className="form-notice">
          {state.notice}
        </p>
      ) : null}
    </form>
  );
}
