# Sant Vaani App Architecture

Oct 28, 2026 · Anant. Exported from the Claude Doc of the same name; the doc is the source of truth.

## Summary

Sant Vaani is one React Native app for iPhone and Android on a Supabase backend. A curator studio feeds it, and AI finds answers but never speaks for a saint. Curators cut talks from saints' official YouTube channels into short clips, and a person approves each one before it goes live.

The app plays those clips as free YouTube embeds. From version 2, Plus adds licensed audio and the partner saints' archive.

| Layer | Choice | Why |
| --- | --- | --- |
| Mobile app | React Native with Expo, in TypeScript | One codebase for both stores, and iPhone builds in the cloud without a Mac |
| Backend | Supabase: Postgres, sign-in, file storage and server functions | One managed service close to Indian users, on plain Postgres with no lock-in |
| Ask | Claude Opus 5.5 behind a server function | Reads Hindi, English and Hinglish, spots crisis signs, and only picks from curated answers |
| Content | Embeds from official YouTube channels, later licensed audio | Keeps within YouTube's rules, and Plus sells only what we have rights to |
| Curation | Curator Studio web app on the YouTube Data API | New uploads arrive by themselves, and a person approves every clip |
| Payments (v2) | RevenueCat on top of App Store and Google Play billing | One integration for both stores' subscriptions and dakshina |
| Website | Next.js on Vercel | The landing page, plus share pages that open answers in the app |
| Monitoring | PostHog for product analytics, Sentry for crashes | Funnels and retention to judge v1, and crash reports from day one |

Every part is written in TypeScript, so one developer can work across the app, the server functions, the studio and the website.

## Principles

Six rules shape every choice below.

1. **Saints speak, AI only finds.** AI matches a question to clips a person approved. It never writes, summarizes or voices words as a saint's.
2. **Every clip has a right to be there.** Each clip comes from a saint's official channel, a written permission or a license, and the database records which one.
3. **Platform rules are built in.** YouTube clips stay free, unaltered and online only. Downloads, background audio and the paywall apply only to media we license.
4. **Calm is a performance feature.** Today opens from what is already on the phone, with no spinner and no autoplay, and refreshes quietly behind it.
5. **Private by default.** Questions, notes and streaks belong to the user. The app works without an account and asks for one only to sync or subscribe.
6. **A stack a small team can run.** Managed services and one language mean no servers to look after, and one developer can ship.

## System map

_Diagram: system map · 3 front ends, 1 backend, 8 outside services (see the original doc for the drawing)._

The app reads and writes through Supabase, and goes straight to YouTube's player, RevenueCat, PostHog, Sentry and the native sign-in sheets. Only the backend calls Claude, the YouTube Data API, Expo Push and the SMS provider, and RevenueCat reports purchases back to it by webhook.

## The app

The app is one Expo project in TypeScript that ships to both stores and keeps working when the network drops.

| Part | How it works |
| --- | --- |
| Screens | Today, Ask, Scriptures, Saints and Paths tabs, plus the player, saved items and settings |
| Look | Ganga Ghat and Chandni are two sets of the same color tokens. The app switches at sunset for the user's city, or follows the phone's dark mode |
| Type and motion | Marcellus, Mukta and Tiro Devanagari Sanskrit ship inside the app. Transitions are slow and eased, built with Reanimated |
| Offline | The Gita ships in a local SQLite database, so the reader works with no signal. Notes, saves and progress save on the phone first and sync later |
| Catalogue | Each night the app quietly downloads the live topics, answers and paths as one file, so browsing never waits on the network |
| YouTube clips | YouTube's own player inside a web view, set to the clip's start and end. Never autoplayed, and it stops when the screen closes |
| Licensed audio (v2) | A native audio player that keeps playing in the background and can download, for licensed media only |
| Voice | Speak-your-question uses the phone's built-in speech recognition, which handles Hindi and English |
| Notifications | Expo push for the daily path reminder and for "your question was answered" |
| Sharing | WhatsApp share cards carry a link that opens the answer in the app, or on the website for people without it |
| Releases | EAS Build makes store builds in the cloud, and EAS Update ships small fixes between store reviews |

The Sanskrit text of the Gita is free to use, but most modern translations are under copyright. The Hindi and English meanings need to be written for us or licensed.

## Backend and data model

The whole backend runs on Supabase in its [Mumbai region](https://supabase.com/docs/guides/platform/regions) (ap-south-1): one Postgres database, sign-in, file storage and TypeScript server functions.

Everyone starts as a guest on first open, so nobody fills in a form before their first answer. A guest can later add Apple, Google or phone sign-in to keep notes across phones. Postgres row-level security means each person can only ever read their own notes, saves and progress.

Server functions handle Ask, the payment webhook in v2, and the nightly jobs: fetching new uploads, checking live clips, building the catalogue file and sending reminders.

| Area | Tables | What they hold |
| --- | --- | --- |
| Saints | saints, channels, permissions | Each saint, their official channels, and whether we only embed, hold written permission, or license their media |
| Clips | videos, clips | YouTube facts refreshed from the API, and each clip's start, end, language, saint, one-line summary and review status |
| Guidance | topics, questions, answers, steps | The 40 topics, the questions people ask in many phrasings, and each answer: 3 to 5 clips, a tying verse and one small practice |
| Scripture | scriptures, verses, word\_meanings | Sanskrit, transliteration, Hindi and English meanings, word by word, and recitation audio |
| Paths | paths, path\_days | Seven-day paths, each day a clip, a verse and a step |
| Community (v2) | community\_questions, votes | Questions people submit, their votes, and the partner saint's recorded answer |
| People | profiles, saves, notes, path\_progress, asks | Language, reminder time and theme, plus what each person saved, wrote, completed and asked |
| Money (v2) | entitlements, offerings | Plus status copied from RevenueCat, and dakshina given to partner saints |

Licensed audio for Plus sits in a private storage bucket. The app gets short-lived signed links to it, and only while the person's Plus is active.

## Content pipeline

New talks flow in from official channels by themselves, but nothing reaches the app until a curator has watched the part and set its exact start and end.

1. **Allowlist.** Curators add each saint's official channel once, with its permission status. Only those channels feed the app, so views and ad income go to the saint.
2. **Fetch.** Each night a job reads every channel's uploads list from the YouTube Data API. A page of uploads or a batch of video details costs 1 unit of a [10,000-unit daily quota](https://developers.google.com/youtube/v3/determine_quota_cost), so quota is not a constraint.
3. **Suggest.** Claude Opus 5.5 reads each new video's title, description and chapter times, then suggests topics and where to look. It runs overnight through the Batch API at [half price](https://platform.claude.com/docs/en/about-claude/pricing). It never hears the audio, because [YouTube forbids downloading it](https://developers.google.com/youtube/terms/developer-policies) (III.E.1).
4. **Review.** In Curator Studio, a curator watches the suggested part in the embedded player, sets the exact start and end, and confirms the topic. They write the one-line summary in their own words. Clips on grief, self-harm or family conflict need a second reviewer.
5. **Assemble.** Curators build each answer from 3 to 5 clips by different saints, plus the Gita verse that ties them together and one small step.
6. **Publish.** Approved answers go into the next nightly catalogue file.
7. **Check every day.** A job re-checks each live clip's video. If it went private, was deleted or stopped allowing embeds, the clip comes down and its answer is flagged for a replacement. The same job refreshes stored YouTube data, which [may be kept for at most 30 days](https://developers.google.com/youtube/terms/developer-policies) without a refresh (III.E.4).
8. **Follow demand.** Questions that matched nothing well are grouped each week into a backlog, so curators work on what people actually ask.

Version 1 needs about 400 clips from 12 to 15 channels. At around 40 approved clips a day, that is roughly two weeks of one curator's time. That rate is a guess to check in the first week.

In version 2, partner saints send recordings directly. These go through the same review and carry their license terms, such as whether they may be downloaded. If a saint or channel asks us to take their clips down, one switch in the studio hides all of them at once.

## Ask

_Diagram: Ask flow · topic taps and typed questions (see the original doc for the drawing)._

Topic taps never touch the model, so they are instant and free. A typed or spoken question gets one Claude Opus 5.5 call at low effort, which returns a fixed JSON shape: a crisis flag, the language, and the closest curated questions with a confidence score. The list of curated questions sits in a cached prompt, so each call pays the full input price only for the question itself.

## Payments and Plus

Version 1 charges nothing. From version 2, RevenueCat sells Plus through Apple's and Google's billing, and everything built on YouTube stays free.

| Tier | What it unlocks | Price | Why it is allowed |
| --- | --- | --- | --- |
| Free | Search, saints' answers, daily guidance and three paths | Free | YouTube clips [can't be charged for](https://developers.google.com/youtube/terms/developer-policies) (III.F.3.1) |
| Plus | All paths, the partner saints' archive, audio mode, offline listening and family sharing | ₹99 a month or ₹799 a year in India, $4.99 a month or $39.99 a year abroad | Only licensed media and our own content sit behind it |
| Dakshina | An offering to a partner saint after an answer | A small platform fee | Sold as an in-app purchase, which Apple [requires for tips](https://developer.apple.com/app-store/review/guidelines/) (3.1.1) |

The app shows the Plus screen from RevenueCat's offerings, and the purchase runs through the App Store or Google Play. RevenueCat then calls a Supabase function, which marks the person's Plus as active. From that moment the licensed audio links open for them.

Apple lets a gift skip in-app purchase only when 100% reaches the person receiving it (3.2.1(vii)), so a dakshina that carries our fee has to be an in-app purchase. Family sharing uses Apple's Family Sharing on iPhone. Google Play's rules on dakshina and family plans need checking before either launches on Android.

## Privacy, safety and compliance

Each outside rule the app depends on maps to one part of the design, so anyone can check it line by line.

| Rule | Source | How the design meets it |
| --- | --- | --- |
| Don't charge people to watch embedded YouTube | [YouTube policies](https://developers.google.com/youtube/terms/developer-policies) III.F.3.1 | Every YouTube clip is in the free tier |
| No background play, downloads or offline copies of YouTube | YouTube III.I.09, III.E.1 | The YouTube player stops off screen, and only licensed audio downloads |
| Don't modify, block or cover the player | YouTube III.I.06 | Our controls sit around the player, never on it |
| Player at least 200 by 200 px, and autoplay only when over half is visible | YouTube [minimum functionality](https://developers.google.com/youtube/terms/required-minimum-functionality) | A full-width player, and no autoplay at all |
| Refresh or delete stored YouTube data within 30 days | YouTube III.E.4 | The daily clip check refreshes it |
| Link YouTube's Terms, and name YouTube API Services and Google's Privacy Policy in ours | YouTube III.A.1, III.A.2 | Linked from settings and from the sign-in screen |
| No saving or downloading media from YouTube without authorization | [Apple guidelines](https://developer.apple.com/app-store/review/guidelines/) 5.2.3 | Met by the YouTube rules above |
| More than a repackaged website or a collection of links | Apple 4.2, 4.2.2 | The reader, paths, Ask and notes are our own features and content |
| Account deletion inside the app | Apple 5.1.1(v) | Settings has Delete account, which erases the profile, notes and question history |
| In-app purchase for unlocks and tips | Apple 3.1.1 | RevenueCat over each store's billing |
| Verifiable parental consent for anyone under 18, and no tracking or targeted ads aimed at them | India's DPDP Act ([summary](https://www.prsindia.org/files/bills_acts/bills_parliament/2023/Summary_Digital_Personal_Data_Protection_Bill_2023.pdf)); the children's rules apply from about May 2027 ([EY](https://www.ey.com/content/dam/ey-unified-site/ey-com/en-in/pdf/2025/11/ey-india-dpdp-act-2023-and-rules-2025-pov.pdf)) | Accounts are 18+ at launch, with an age question at sign-up. Parental consent and a no-tracking mode come before teenagers get accounts |

Every typed or spoken question gets a crisis check before matching. If it shows signs of self-harm or suicide, the app shows Tele-MANAS (14416 or 1800-891-4416), or the local helpline abroad, before any clip. The app offers guidance, not therapy, and says so.

Notes and question history are private to each person, and analytics never receive question text, notes or names. Typed questions go to the Claude API for matching, so the privacy policy says that plainly. A published curation policy covers balance across traditions, no political clips, second review on sensitive topics, and how fast takedowns happen.

## Analytics and quality targets

PostHog tracks whether v1 hits its two targets: 25% of people still active after 30 days, and at least one share per weekly user.

The core funnel, read every week:

1. Opened the app
2. Tapped a topic or asked a question
3. Played a clip, measured by the YouTube player's own play and end events
4. Finished an answer
5. Saved, shared or started a path
6. Completed day 7 of a path

Ask is watched on its own: how many questions find a strong match, how big the weekly unmatched backlog is, and how often the safety screen appears, as a count and never the text.

| Measure | Proposed target | Measured by |
| --- | --- | --- |
| Today on screen after opening | Under 1 second, from cached content | PostHog timing event |
| Answers after asking | Under 3 seconds | Server function logs |
| Crash-free sessions | 99.5% or more | Sentry |
| Typed questions with a strong match | 8 in 10 | Ask logs |

## Running costs at launch

Fixed costs come to about $45 a month plus the store fees, and Ask is the only cost that grows with use. Prices are in US dollars, as these services bill.

| Item | Cost | Notes |
| --- | --- | --- |
| [Apple](https://developer.apple.com/support/enrollment/) and [Google Play](https://support.google.com/googleplay/android-developer/answer/6112435) developer accounts | $99 a year, and $25 once | Needed before the first beta |
| [Supabase Pro](https://supabase.com/pricing) | $25 a month | Free projects pause after a week without activity, so production needs Pro. Includes 100,000 monthly active users, an 8 GB database and 100 GB of files |
| [Vercel Pro](https://vercel.com/docs/plans/hobby) | $20 a month per developer | The free Hobby plan is for non-commercial use only |
| [Expo EAS](https://expo.dev/pricing) | $0 to start, then $19 a month | Free covers 15 iOS and 15 Android builds a month, and updates to 1,000 monthly users |
| [Claude API](https://platform.claude.com/docs/en/about-claude/pricing) for Ask | About $250 a month on Opus 5.5, or about $7 on Haiku 5.5 | Assumes 1,000 typed questions a day, an 8,000-token cached prompt and a 300-token reply. Topic taps cost nothing |
| [PostHog](https://posthog.com/pricing), [Sentry](https://sentry.io/pricing/), [RevenueCat](https://www.revenuecat.com/pricing) | $0 at launch | Free tiers: 1 million PostHog events a month, 5,000 Sentry errors, and RevenueCat free below $2,500 a month of revenue, then 1% |

Opus 5.5 is the safer default for reading Hinglish and spotting distress, and Haiku 5.5 costs about a thirtieth as much. The way to choose is to run both on 200 real questions from the Instagram test and compare the matches.

## Build plan

_Diagram: build plan · 4 phases and 3 checkpoints (see the original doc for the drawing)._

Curator Studio comes first because the Instagram test needs approved clips too, so the six weeks of testing also start the library. If week 6 misses the go signal, rework the idea and test again before building the app. The weeks assume one full-time developer, one curator and a part-time designer, with Anant leading the partnerships with saints.

## Risks and how the design handles them

The biggest risk is leaning on YouTube. The design answers it twice: several saints in every answer now, and licensed partner media from version 2.

| Risk | How the design handles it |
| --- | --- |
| A channel deletes a video or turns off embedding | The daily check pulls the clip, and the answer still has 2 to 4 other saints |
| YouTube tightens its rules | Version 2 moves the core library onto partner media we hold rights to |
| App Review calls the app a collection of links (4.2.2) | The reader, paths, notes and Ask are our own, and they lead the submission |
| AI puts words in a saint's mouth | AI never writes teaching text. Curators write the summaries, and clips play unedited |
| Someone in crisis asks a question | The crisis check runs on every question, and the helpline comes first |
| A clip gives offence across traditions | A published curation policy, a second review on sensitive topics, and one-switch takedowns |
| Curation can't keep up | Overnight suggestions, a backlog led by real questions, and a v1 limited to 40 topics |
| The Ask bill grows with use | Topic taps skip the model, and Haiku 5.5 is the fallback once tested |
| Teenagers sign up | Accounts stay 18+ until parental consent is built, ahead of the May 2027 rules |
