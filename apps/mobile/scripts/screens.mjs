// Screenshots of the web build at phone size: Today by day and by night, in
// Hindi and on a fresh install, the welcome screen and the Gita reader. The
// app reads the sample catalogue from the tests, served from this script as
// if it were the nightly file.
//
//   npm run screens -w mobile        writes apps/mobile/screens/*.png
//
// Needs Playwright with Chromium (npm i -g playwright && npx playwright install chromium).

import { spawn } from 'node:child_process';
import { createReadStream, existsSync, mkdirSync, readFileSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { createRequire } from 'node:module';
import { dirname, extname, join, normalize, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const app = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(app, 'screens');
const web = join(out, 'web');

const PREFS_KEY = 'sant-vaani:prefs';
const USER_DATA_KEY = 'sant-vaani:user-data';
const ADULT = '2026-10-01T00:00:00.000Z';

/** A saved verse 2.47 with a note on it, as the app keeps them on the phone. */
function verseNote(body) {
  const at = '2026-10-27T15:00:00.000Z';
  const note = { id: 'a3c1e1f4-5f1e-4b8e-9d2a-0c9b7f1d2e47', chapter: 2, verse: 47, body, createdAt: at, updatedAt: at };
  return {
    notes: { [note.id]: { ...note, deletedAt: null, revision: 1, syncedRevision: 1 } },
    saves: { 'verse:gita:2.47': { kind: 'verse', ref: 'gita:2.47', createdAt: at } },
    pendingSaves: {},
  };
}

const SHOTS = [
  { name: 'today-light', time: '2026-10-28T07:15:00+05:30', prefs: { language: 'en' }, waitFor: "Today's guidance" },
  { name: 'today-dark', time: '2026-10-28T19:10:00+05:30', prefs: { language: 'en' }, waitFor: "Today's guidance" },
  { name: 'today-hindi', time: '2026-10-28T07:15:00+05:30', prefs: { language: 'hi' }, waitFor: 'आज का मार्गदर्शन' },
  { name: 'welcome', time: '2026-10-28T07:15:00+05:30', prefs: null, waitFor: 'I am 18 or older' },
  // A fresh install with no connection: only what ships inside the app.
  {
    name: 'first-launch',
    time: '2026-10-28T07:15:00+05:30',
    prefs: { language: 'en' },
    waitFor: "The saints' answers are on their way. Until then, sit with today's verse.",
    offline: true,
  },
  {
    name: 'scriptures',
    path: '/scriptures',
    time: '2026-10-28T07:15:00+05:30',
    prefs: { language: 'en' },
    userData: verseNote('Do the work and let the result go. Read this before every exam.'),
    waitFor: 'Your verses',
  },
  {
    name: 'chapter',
    path: '/gita/2',
    time: '2026-10-28T07:15:00+05:30',
    prefs: { language: 'en' },
    userData: verseNote('Do the work and let the result go. Read this before every exam.'),
    waitFor: 'The Yoga of Knowledge',
  },
  {
    name: 'reader',
    path: '/gita/2/47',
    time: '2026-10-28T07:15:00+05:30',
    prefs: { language: 'en' },
    userData: verseNote('Do the work and let the result go. Read this before every exam.'),
    waitFor: 'Delete note',
  },
  {
    name: 'reader-hindi-night',
    path: '/gita/2/47',
    time: '2026-10-28T21:30:00+05:30',
    prefs: { language: 'hi' },
    userData: verseNote('कर्म करो, फल की चिंता मत करो। हर परीक्षा से पहले इसे पढ़ना।'),
    waitFor: 'नोट हटाएँ',
  },
];

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.ttf': 'font/ttf',
};

const playwright = loadPlaywright();
const catalogue = sampleCatalogue();
const server = createServer((request, response) => {
  const path = decodeURIComponent(new URL(request.url ?? '/', 'http://localhost').pathname);
  if (path === '/catalogue.json') {
    response.writeHead(200, { 'Content-Type': 'application/json', ETag: '"screens"' });
    response.end(catalogue);
    return;
  }
  // Any other path that is not a file gets the app, which routes it.
  let file = normalize(join(web, path));
  if (!file.startsWith(web + sep) || !existsSync(file) || statSync(file).isDirectory()) file = join(web, 'index.html');
  response.writeHead(200, { 'Content-Type': TYPES[extname(file)] ?? 'application/octet-stream' });
  createReadStream(file).pipe(response);
});
await new Promise((ready) => server.listen(0, '127.0.0.1', ready));
const origin = `http://127.0.0.1:${server.address().port}`;

try {
  mkdirSync(out, { recursive: true });
  await exportWeb(`${origin}/catalogue.json`);
  const browser = await playwright.chromium.launch();
  try {
    for (const shot of SHOTS) {
      const path = join(out, `${shot.name}.png`);
      await capture(browser, shot, path);
      console.log(`wrote ${path}`);
    }
  } finally {
    await browser.close();
  }
} finally {
  server.close();
}

async function capture(browser, shot, path) {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    timezoneId: 'Asia/Kolkata',
    locale: shot.prefs?.language === 'hi' ? 'hi-IN' : 'en-IN',
    colorScheme: 'light',
  });
  try {
    const saved = {
      ...(shot.prefs ? { [PREFS_KEY]: JSON.stringify({ ...shot.prefs, ageConfirmedAt: ADULT }) } : {}),
      ...(shot.userData ? { [USER_DATA_KEY]: JSON.stringify(shot.userData) } : {}),
    };
    await context.addInitScript((entries) => {
      for (const [key, value] of Object.entries(entries)) localStorage.setItem(key, value);
    }, saved);
    const page = await context.newPage();
    if (shot.offline) await page.route(`${origin}/catalogue.json`, (route) => route.abort('internetdisconnected'));
    await page.clock.setFixedTime(new Date(shot.time));
    await page.goto(`${origin}${shot.path ?? '/'}`);
    await page.getByText(shot.waitFor, { exact: true }).first().waitFor({ timeout: 30_000 });
    await page.waitForLoadState('networkidle');
    await page.evaluate(() => document.fonts.ready);
    // Lets the screen's fade-in finish.
    await page.waitForTimeout(600);
    await page.screenshot({ path });
  } finally {
    await context.close();
  }
}

/** The test catalogue, dated now so the app prefers it to the one it ships with. */
function sampleCatalogue() {
  const sample = JSON.parse(readFileSync(join(app, '__tests__/fixtures/sample-catalogue.json'), 'utf8'));
  const seed = JSON.parse(readFileSync(join(app, 'assets/catalogue.seed.json'), 'utf8'));
  const generatedAt = new Date(Math.max(Date.now(), Date.parse(seed.generatedAt) + 1000)).toISOString();
  return JSON.stringify({ ...sample, generatedAt });
}

function exportWeb(catalogueUrl) {
  // No sign-in or analytics in screenshot builds, whatever .env says.
  const env = {
    ...process.env,
    EXPO_NO_DOTENV: '1',
    EXPO_OFFLINE: '1',
    EXPO_PUBLIC_CATALOGUE_URL: catalogueUrl,
    EXPO_PUBLIC_SUPABASE_URL: '',
    EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: '',
    EXPO_PUBLIC_POSTHOG_KEY: '',
  };
  // --clear, because the catalogue address is baked into the bundle and changes each run.
  const args = ['expo', 'export', '--platform', 'web', '--output-dir', web, '--clear'];
  return new Promise((done, fail) => {
    spawn('npx', args, { cwd: app, env, stdio: 'inherit' }).on('exit', (code) =>
      code === 0 ? done() : fail(new Error(`expo export exited with code ${code}`)),
    );
  });
}

function loadPlaywright() {
  try {
    // createRequire also finds a global install through NODE_PATH.
    return createRequire(import.meta.url)('playwright');
  } catch {
    console.error('Screenshots need Playwright: npm i -g playwright && npx playwright install chromium');
    process.exit(1);
  }
}
