// Downloads the published catalogue and saves it as the copy that ships
// inside the app, so a fresh install opens with real content before it has
// a network connection. Run it before each store build.
//
//   npm run catalogue:pull -w mobile
//
// Reads EXPO_PUBLIC_CATALOGUE_URL, or EXPO_PUBLIC_SUPABASE_URL, from the
// environment or from apps/mobile/.env.

import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { CATALOGUE_BUCKET, CATALOGUE_FILE, parseCatalogue } from '@sant-vaani/core';

const app = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const seedPath = join(app, 'assets/catalogue.seed.json');

for (const file of ['.env.local', '.env']) {
  try {
    // Variables already set in the environment win.
    process.loadEnvFile(join(app, file));
  } catch {
    // Neither file is required.
  }
}

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL?.trim().replace(/\/+$/, '');
const url =
  process.env.EXPO_PUBLIC_CATALOGUE_URL?.trim() ||
  (supabaseUrl ? `${supabaseUrl}/storage/v1/object/public/${CATALOGUE_BUCKET}/${CATALOGUE_FILE}` : '');
if (!url) fail('Set EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_CATALOGUE_URL first (see .env.example).');

const response = await fetch(url).catch((error) => fail(`Could not reach ${url}: ${error.message}`));
if (!response.ok) fail(`Could not download ${url}: HTTP ${response.status}.`);

let catalogue;
try {
  catalogue = parseCatalogue(await response.json());
} catch (error) {
  fail(`The file at ${url} is not a valid catalogue: ${error.message}`);
}

const shipped = parseCatalogue(JSON.parse(readFileSync(seedPath, 'utf8')));
if (Date.parse(catalogue.generatedAt) < Date.parse(shipped.generatedAt)) {
  fail(`The file at ${url} (${catalogue.generatedAt}) is older than the one in the app (${shipped.generatedAt}).`);
}

writeFileSync(seedPath, `${JSON.stringify(catalogue, null, 2)}\n`);
console.log(
  `Saved the catalogue from ${catalogue.generatedAt}: ${catalogue.answers.length} answers, ` +
    `${catalogue.topics.length} topics, ${catalogue.paths.length} paths, ${catalogue.dailyVerses.length} daily verses.`,
);

function fail(message) {
  console.error(message);
  process.exit(1);
}
