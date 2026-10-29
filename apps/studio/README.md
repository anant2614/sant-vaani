# Curator Studio

The web app where the curation team turns saints' official YouTube talks into clips, answers and seven-day paths for Sant Vaani. Anyone can request a sign-in code; only people on the staff list get past it.

## Run it locally

1. From the repository root, run `npm install`, then `npx supabase start` (needs Docker).
2. Copy `apps/studio/.env.example` to `apps/studio/.env.local` and paste the publishable key that `supabase start` printed. Adding channels and videos by link also needs a YouTube Data API key.
3. Run `npm run dev -w studio` and open http://localhost:3000.
4. Sign in with any email. Locally the code arrives in Mailpit at http://127.0.0.1:54324.
5. Make yourself the first admin from psql or the SQL editor, then sign in again:

   ```sql
   select public.add_staff('you@example.com', 'admin', 'Your name');
   ```

   After that, admins add curators and reviewers on the Staff screen.

## Checks

```sh
npm test -w studio
npm run typecheck -w studio
npm run lint -w studio
npm run build -w studio
```

## Where things are

- `src/app/(studio)/`: one folder per screen, each with its page and its server actions.
- `src/lib/`: form parsing, the answer and path rules in plain words, Supabase clients and the YouTube client.
- The database enforces the curation rules (`supabase/migrations/*_rules.sql` and `*_studio.sql`); the studio only explains them, so no screen can skip one.
