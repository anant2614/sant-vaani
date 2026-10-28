import type { Metadata } from 'next';
import { signOut } from '../actions';
import { LoginForm } from './LoginForm';

export const metadata: Metadata = { title: 'Sign in' };

export default async function LoginPage({ searchParams }: PageProps<'/login'>) {
  const { reason } = await searchParams;
  return (
    <main className="page" style={{ maxWidth: 440 }}>
      <h1>Curator Studio</h1>
      <p className="muted">For the Sant Vaani curation team. We email you a code; there is no password.</p>
      {reason === 'not-staff' ? (
        <div className="card stack">
          <p>
            You are signed in, but your account is not on the staff list yet. Ask an admin to add the email you used,
            then sign in again.
          </p>
          <form action={signOut}>
            <button type="submit" className="secondary">
              Sign out
            </button>
          </form>
        </div>
      ) : (
        <LoginForm />
      )}
    </main>
  );
}
