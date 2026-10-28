# Sant Vaani

Sant Vaani answers life's questions with short clips of saints from their
official YouTube channels, alongside the Bhagavad Gita and seven-day paths.
Curators cut and approve every clip; AI only finds the right ones and never
speaks for a saint.

This repository holds the whole of version 1:

| Folder | What it is |
| --- | --- |
| `apps/mobile` | The iPhone and Android app (Expo, React Native). See its README |
| `apps/studio` | Curator Studio, the web app where the team turns talks into clips, answers and paths (Next.js). See its README |
| `packages/core` | TypeScript shared by all three: the catalogue format, the Ask contract and crisis check, text and theme helpers, the YouTube client |
| `supabase/migrations`, `supabase/seed` | The database: tables, row-level security, curation rules, nightly schedule, and the Gita and starting topics |
| `supabase/functions` | Server functions in Deno: `ask`, and the nightly `fetch-uploads`, `suggest-clips`, `check-clips` and `build-catalogue` |
| `supabase/tests` | Database tests (pgTAP) |
| `scripts` | Builds the Gita data, and copies `packages/core` for the server functions |
| `docs` | The architecture, the setup guide and the build plan |

## Run it locally

You need Node 22, Docker (for the local Supabase) and, for the server
function tests, Deno 2.

```bash
npm install
npx supabase start          # database, sign-in and storage in Docker; prints the local keys
```

Then, in separate terminals:

```bash
# Curator Studio on http://localhost:3000 (copy .env.example to .env.local first)
npm run dev -w studio

# The app; every value in apps/mobile/.env.local is optional
npm run start -w mobile

# The server functions, with Claude and YouTube keys in supabase/functions/.env
npx supabase functions serve --env-file supabase/functions/.env
```

Sign-in codes for the studio arrive in Mailpit at http://127.0.0.1:54324.
The studio README explains how to make yourself the first admin.

## Check it

CI (`.github/workflows/ci.yml`) runs these on every pull request:

```bash
npm run check:core          # the server functions' copy of packages/core is current
npm run test:gita           # the Gita build
npm test                    # core, studio and app tests
npm run typecheck           # run `npx expo customize tsconfig.json` in apps/mobile once first
npm run lint -w studio
npm run lint -w mobile
npm run test:functions      # Deno tests for the server functions
npm run test:db             # database tests; needs `npx supabase start`
```

## Working on it

- Change shared code in `packages/core`, then run `npm run sync:core`: the
  server functions deploy only what sits under `supabase/functions`, so they
  use a copy.
- Change the database with a new file in `supabase/migrations`, and add a
  pgTAP test for any new rule. `npx supabase db reset` rebuilds the local
  database from scratch.
- Every string the app shows is in `apps/mobile/src/i18n/strings.ts`, in
  English and Hindi.

## Docs

- `docs/architecture.md`: how the system fits together and why.
- `docs/setup.md`: the accounts, keys and settings production needs.
- `docs/superpowers/plans/2026-10-28-version-1.md`: the plan version 1 was
  built from.

## Not in version 1 yet

- Plus, payments and licensed audio (version 2).
- The website, which needs the privacy, terms and shared-answer pages before
  the store submissions (see the setup guide).
- Crash reports through Sentry.
- Hindi and English meanings of the Gita verses, which need writing or
  licensing; the reader shows the Sanskrit and its transliteration.
