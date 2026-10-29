# Sant Vaani app

The phone app, built with Expo SDK 58 and Expo Router. It opens on Today: one
question answered by the saints, topics to explore, the day's Gita verse and a
seven-day path. Everything it shows comes from the catalogue file, so it works
offline with the copy it ships with and refreshes that copy in the background.

The tabs are Today, Ask (typed or spoken questions, matched by the Ask
function), Scriptures (the Gita reader with private notes), Saints and Paths.
Answers play each saint's clip in YouTube's own player, one at a time and
never by themselves.

## Run it

From the repository root:

```bash
npm install
cp apps/mobile/.env.example apps/mobile/.env.local   # optional
npm run start -w mobile
```

Every value in `.env.local` is optional. Without them the app opens with the
catalogue it ships with, no sign-in and no analytics.

Speech recognition and notifications are native modules, so voice questions,
reminders and pushes need a development build (`npx expo run:ios` or
`npx expo run:android`, or an EAS build), not Expo Go. Pushes also need the EAS
project id in `app.json` under `extra.eas.projectId`.

## Check it

```bash
npm test -w mobile            # Jest with React Native Testing Library
npm run typecheck -w mobile
npm run screens -w mobile     # phone-size screenshots in screens/, needs Playwright
```

The web build is a preview for screenshots and quick checks. It reads the Gita
from `assets/db/gita.json` instead of SQLite; `npm run gita:build` at the root
writes both copies.

## Before a store build

```bash
npm run catalogue:pull -w mobile
```

This downloads the published catalogue into `assets/catalogue.seed.json`, so a
fresh install opens with current answers before it has a connection.

## Where things are

- `src/app/` holds the screens. Everything except `welcome` sits in the `(app)`
  group, which opens only after the 18+ confirmation.
- `src/catalogue/` loads, caches and refreshes the catalogue.
- `src/gita/` opens the bundled Gita database.
- `src/user/` keeps notes, saves and path progress on the phone first and
  sends them to the guest account when it can.
- `src/ask/` sends questions to the Ask function, after a crisis check on the
  phone that sends anyone in crisis straight to the helplines.
- `src/player/` is the YouTube player: a web view on phones, an iframe on the
  web.
- `src/paths/` works out which day of a path is open and keeps the daily
  reminder scheduled on the phone.
- `src/notifications.ts` asks for permission, registers for pushes and opens
  the screen a tapped notification points at.
- `src/auth/` signs in a guest after the 18+ confirmation and keeps the profile
  row in step with the phone's settings.
- `src/theme/` switches between Ganga Ghat and Chandni at sunrise and sunset.
- `src/i18n/strings.ts` has every English and Hindi string.
- `__tests__/fixtures/sample-catalogue.json` is made-up content for tests and
  screenshots.
