# Setting up Sant Vaani

This guide covers the accounts, keys and settings that version 1 needs in
production, in the order to set them up. The README covers running everything
on your own computer. Monthly costs are in the architecture doc
(`docs/architecture.md`, "Running costs at launch").

Keep every key in a password manager. Only values that start with
`EXPO_PUBLIC_` or `NEXT_PUBLIC_` may go into the app or the browser, because
anyone can read them there.

## Accounts

| Service | What it does for Sant Vaani | Needed before |
| --- | --- | --- |
| [Supabase](https://supabase.com) (Pro plan) | Database, sign-in, files, server functions and the nightly jobs | Anything else |
| [Google Cloud](https://console.cloud.google.com) | The YouTube Data API key for the studio and the nightly jobs | Adding channels |
| [Anthropic](https://platform.claude.com) | Claude reads typed questions (Ask) and suggests clips overnight | Ask with typed questions |
| An email sending service | Sends Curator Studio sign-in codes | Curators can sign in |
| [Vercel](https://vercel.com) (Pro plan) | Hosts Curator Studio, and later the website | Curators can sign in |
| [Expo](https://expo.dev) | Builds the app in the cloud, sends it to the stores, delivers pushes | The first test build |
| [Firebase](https://console.firebase.google.com) | Delivers pushes to Android phones | Android pushes |
| [Apple Developer Program](https://developer.apple.com/programs/) | App Store and TestFlight | iPhone testers |
| [Google Play Console](https://play.google.com/console) | Play Store and testing tracks | Android testers |
| [PostHog](https://posthog.com) | Product analytics, with no question text, notes or names | Launch |
| [Sentry](https://sentry.io) | Crash reports (not wired into the code yet) | Launch |

Use one shared work email as the owner of each account, and add people as
members, so nothing depends on one person's login.

## 1. Supabase

1. Create a project in the **Mumbai** region, the closest to Indian users,
   and move it to the Pro plan. Free projects pause after a week without
   activity.
2. Link the repository to it and create the tables. The seed loads the Gita
   and the starting topics, questions, verses and paths, so include it on the
   first push only:

   ```bash
   npx supabase login
   npx supabase link --project-ref <project ref>
   npx supabase db push --include-seed
   ```

   Later pushes are `npx supabase db push`, after the change has passed CI.
3. **API keys** (Settings, API Keys). Create the publishable and secret keys
   if the project does not show them yet. The app and the studio use the
   publishable key (`sb_publishable_...`). The server functions get the secret
   key from Supabase on their own. Supabase is retiring the old `anon` and
   `service_role` keys by the end of 2026, so nothing here uses them; once the
   app and studio run on the new keys, turn the old ones off on the same page.
4. **Sign-in** (Authentication):
   - Turn on anonymous sign-ins. The app signs each person in as a guest
     after the 18+ confirmation, so notes, saves and questions are theirs
     without an account. The Rate Limits page allows 30 guest sign-ins an
     hour from one IP address. Leave that at launch: mobile carriers in India
     put many phones behind one address, so a lower limit turns real people
     away, and Ask's daily model budget (below) caps what a flood of scripted
     guests can cost. Before a wide public launch, add bot protection to guest
     sign-in, such as App Attest and Play Integrity or a CAPTCHA; version 1
     has none.
   - Set up custom SMTP with your email sending service (Authentication,
     Emails, SMTP Settings). Supabase's own sender only delivers to members of
     the Supabase team, two emails an hour, so curators would never get their
     codes. After saving, raise the email limit on the Rate Limits page; it
     starts at 30 an hour.
   - Paste `supabase/templates/sign_in_code.html` into both the **Magic link**
     and **Confirm signup** templates, with the subject "Your Sant Vaani
     sign-in code". The studio asks for the six-digit code, so the template
     must show `{{ .Token }}`, not a link.
   - Under URL Configuration, set the Site URL to the studio's address and add
     `santvaani://` to the redirect URLs.
5. **Server functions.** Fill in a copy of `supabase/functions/.env.example`
   (named `.env.production`, which git ignores), leaving out any line you
   leave empty, then:

   ```bash
   npx supabase secrets set --env-file supabase/functions/.env.production
   npx supabase functions deploy
   ```

   | Secret | Value |
   | --- | --- |
   | `ANTHROPIC_API_KEY` | From step 3 below. Without it, Ask matches on words alone and no clips are suggested overnight |
   | `YOUTUBE_API_KEY` | From step 2 below |
   | `CRON_SECRET` | A long random value, for example from `openssl rand -hex 32`. The same value goes into Vault in the next step |
   | `ASK_MODEL`, `SUGGEST_MODEL` | Optional. Both default to `claude-opus-5-5` |
   | `ASK_DAILY_MODEL_CALLS` | Optional. How many typed questions a day Ask sends to Claude, across everyone. Past it, Ask matches on words until midnight India time. Defaults to 3000, three times the launch estimate; 0 turns Claude off for Ask |
   | `EXPO_ACCESS_TOKEN` | Optional. Only if push security is turned on in the Expo account |

   Why `verify_jwt` is off for every function (`supabase/config.toml`): Ask
   checks the person's token itself with `auth.getClaims`, which works with
   Supabase's new signing keys, while the platform's built-in check only
   understands the old ones. The nightly jobs are called by the database with
   `CRON_SECRET`, not with a person's token, and check that secret
   themselves. `functions deploy` reads these settings from `config.toml`.
6. **Nightly jobs.** In the SQL editor, store the project address and the
   same `CRON_SECRET` in Vault. Until both exist, the jobs skip their runs.

   ```sql
   select vault.create_secret('https://<project ref>.supabase.co', 'project_url');
   select vault.create_secret('<the CRON_SECRET value>', 'cron_secret');
   ```

   The jobs run at 01:00 (new uploads), 02:00 (clip checks) and 03:00
   (catalogue and "your question was answered" pushes), India time, and clip
   suggestions run every hour. To see recent runs:

   ```sql
   select jobname, status, return_message, start_time
   from cron.job_run_details join cron.job using (jobid)
   order by start_time desc limit 20;
   ```

   What each job did is in the function logs (Edge Functions, Logs).

## 2. YouTube Data API

1. In Google Cloud, create a project and enable **YouTube Data API v3**.
2. Create two API keys, one for the studio and one for the server functions,
   so either can be replaced without the other. Restrict both to the YouTube
   Data API v3.
3. The default quota is 10,000 units a day. Every call Sant Vaani makes
   (channels, playlist items and videos) costs one unit, and each call covers
   up to 50 videos, so the nightly jobs use a small part of it. A quota
   increase needs YouTube's compliance audit.
4. YouTube's developer policies apply to the whole app. The app already links
   YouTube's Terms of Service and Google's Privacy Policy, and our privacy
   policy must say that the app uses YouTube API Services.

## 3. Anthropic

1. In the Claude Console, create the organization, add billing, set a
   monthly spend limit and add a spend notification well below it. If the
   limit is reached, Ask keeps working by matching on words, but no clips are
   suggested overnight until the next month.
2. Create an API key for the server functions and set it as
   `ANTHROPIC_API_KEY`.
3. Ask uses Claude Opus 5.5 by default. Haiku 5.5 costs far less; before
   switching (`ASK_MODEL=claude-haiku-5-5`), compare both on a few hundred real
   questions, as the architecture doc suggests.
4. Typed questions go to the Claude API for matching, and the privacy policy
   must say so. Questions caught by the crisis check on the phone never leave
   the phone.

## 4. Curator Studio

1. In Vercel, import the GitHub repository and set the Root Directory to
   `apps/studio`. Vercel installs the npm workspace from the repository root,
   so the studio can use `packages/core`.
2. Set `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` and
   `YOUTUBE_API_KEY` (the studio's key) for Production and Preview.
3. Give it its own address, such as `studio.santvaani.app`, and use that as
   the Site URL in Supabase.
4. Sign in once with your own email, then make yourself the first admin in
   the SQL editor and sign in again:

   ```sql
   select public.add_staff('you@example.com', 'admin', 'Your name');
   ```

   From then on, admins add curators and reviewers on the Staff screen. Each
   person signs in once before they can be added.

## 5. Expo and app builds

1. Create an Expo organization and add the team. From `apps/mobile`:

   ```bash
   npx eas-cli login
   npx eas-cli init              # writes extra.eas.projectId into app.json
   npx eas-cli build:configure   # writes eas.json
   ```

   Commit both changes. Pushes need the project id.
2. Confirm the app ids before the first store build, because they cannot
   change after release: `com.santvaani.app` on both stores, and the link
   scheme `santvaani`, all in `app.json`.
3. Speech recognition and notifications are native modules, so testing needs
   a development build, not Expo Go: add `expo-dev-client` with
   `npx expo install expo-dev-client`, then
   `npx eas-cli build --profile development --platform ios` (or `android`).
4. `.env.local` stays on your computer, so cloud builds read their
   `EXPO_PUBLIC_` values from EAS environment variables. Add them for the
   preview and production environments in the Expo dashboard:

   | Variable | Value |
   | --- | --- |
   | `EXPO_PUBLIC_SUPABASE_URL` | `https://<project ref>.supabase.co` |
   | `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | The publishable key |
   | `EXPO_PUBLIC_POSTHOG_KEY`, `EXPO_PUBLIC_POSTHOG_HOST` | From PostHog |
   | `EXPO_PUBLIC_SITE_URL` | The website, once it serves `/terms` and `/privacy` |
   | `EXPO_PUBLIC_SHARE_BASE_URL` | Optional. Where shared answers link (`<url>/a/<answer id>`); defaults to the website |

   `EXPO_PUBLIC_CATALOGUE_URL` can stay empty: the app finds the catalogue in
   the project's storage.
5. Before each store build, run `npm run catalogue:pull -w mobile` so a new
   install opens with current answers before it has a connection.

## 6. Push notifications

The daily path reminder is scheduled on the phone and needs no setup beyond a
development or store build. "Your question was answered" comes through Expo's
push service:

- **iPhone.** On the first build, answer yes when EAS offers to set up push
  notifications and generate the Apple push key.
- **Android.** Create a Firebase project and add an Android app with the
  package `com.santvaani.app`. Download `google-services.json` into
  `apps/mobile` and point to it in `app.json` under `expo.android`:
  `"googleServicesFile": "./google-services.json"`. Then, in Firebase Project
  settings, Service accounts, generate a private key and give it to EAS:
  `npx eas-cli credentials`, Android, production, Google Service Account,
  "Manage your Google Service Account Key for Push Notifications (FCM V1)",
  and upload the key. Keep that key file out of git.

## 7. App Store and Google Play

- **Apple.** Enrol in the Developer Program (an organization needs a D-U-N-S
  number), then create the app in App Store Connect with the bundle id
  `com.santvaani.app`. In the review notes, say that the app signs people in
  as guests (no login needed), where Delete account is (Settings), that clips
  are YouTube's own player with no background play, and that AI only matches
  questions to clips people approved.
- **Google Play.** Personal developer accounts created after 13 November 2023
  must run a closed test with at least 12 testers, opted in for 14 days in a
  row, before they can publish to production, and then wait for review
  (usually a week or less). Start that test as early as possible, or register
  as an organization.
- Both stores ask what data the app collects. In short: the questions people
  type (sent to our server and the Claude API), notes, saves and path
  progress (stored against a guest account), a push token if they ask to be
  notified, and analytics events without question text, notes or names.
- `npx eas-cli submit` uploads a finished build to either store.

## 8. PostHog and Sentry

- **PostHog.** Create a project on the EU or US cloud and copy its key and
  host into the EAS variables above. The events are listed in
  `apps/mobile/src/analytics.ts`, and deleting an account starts a new
  analytics id.
- **Sentry.** Version 1 does not report crashes yet. Create React Native and
  Next.js projects now, so the app and studio can be connected before launch;
  the crash-free target in the architecture doc depends on it.

## 9. Before submitting to the stores

The website is not part of version 1's code, but the stores and the app need
three pages on it:

- `/privacy`, which must name YouTube API Services and link Google's Privacy
  Policy, say that typed questions go to the Claude API, name PostHog, and
  explain account deletion.
- `/terms`.
- `/a/<answer id>`, for shared answers: open the app if it is installed, or
  show the answer and the store links.

Set `EXPO_PUBLIC_SITE_URL` once the first two exist; the app shows those links
only when it is set, and the YouTube player uses the site as its origin.

## Dependency audit

`npm audit` on 28 October 2026 reported 18 findings (5 high, 13 low). None is
in code that runs in the app, in the studio's server or in the server
functions:

- `zod` 3.25.76 bundled inside `@expo/cli` (high, GHSA-mrhx-c7xc-m3w5). It is
  Expo's command-line tool reading our own config; the fix needs Expo to move
  to zod 4.6.6 or later. Our own code uses zod 4.6.7.
- `toml` under `@indic-transliteration/sanscript` (high, no fix released). It
  is used only by `npm run gita:build`, on files in this repository.
- `deepmerge` 4.3.1 under `@expo/config` and Jest (low, no fixed release).

Do not run `npm audit fix --force`: it would move the app back to Expo SDK 54.
The server functions' packages (`supabase/functions/deno.json`) had no
findings. Run the audit again after each Expo SDK update.
