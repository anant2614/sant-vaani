'use client';

import { useActionState } from 'react';
import { signIn, type LoginState } from './actions';

export function LoginForm() {
  const [state, action, pending] = useActionState<LoginState, FormData>(signIn, { step: 'email' });

  return (
    <form action={action} className="card">
      <fieldset className="form-body" disabled={pending}>
        {state.step === 'email' ? (
          <>
            <label className="field">
              <span>Email</span>
              <input type="email" name="email" autoComplete="email" defaultValue={state.email} required autoFocus />
            </label>
            <button type="submit" name="intent" value="send">
              Send me a code
            </button>
          </>
        ) : (
          <>
            <label className="field">
              <span>Code</span>
              <input
                name="code"
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="[0-9 ]{6,12}"
                required
                autoFocus
              />
              <small>Sent to {state.email}</small>
            </label>
            <div className="actions">
              <button type="submit" name="intent" value="verify">
                Sign in
              </button>
              <button type="submit" name="intent" value="send" className="quiet" formNoValidate>
                Send a new code
              </button>
              <button type="submit" name="intent" value="restart" className="quiet" formNoValidate>
                Use another email
              </button>
            </div>
          </>
        )}
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
