#!/usr/bin/env node
// Copies packages/core/src into supabase/functions/_shared/core, because
// edge functions deploy only what sits under supabase/functions.
// With --check it changes nothing and exits 1 when the copy is stale.
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const source = join(root, 'packages/core/src');
const target = join(root, 'supabase/functions/_shared/core');
const HEADER = '// Copied from packages/core/src by scripts/sync-core.mjs. Edit the original and run npm run sync:core.\n';

function listFiles(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith('.ts'))
    .map((entry) => relative(dir, join(entry.parentPath, entry.name)))
    .sort();
}

const expected = new Map(listFiles(source).map((file) => [file, HEADER + readFileSync(join(source, file), 'utf8')]));

if (process.argv.includes('--check')) {
  const actual = listFiles(target);
  const problems = [
    ...[...expected.keys()].filter((file) => !actual.includes(file)).map((file) => `missing ${file}`),
    ...actual.filter((file) => !expected.has(file)).map((file) => `extra ${file}`),
    ...actual
      .filter((file) => expected.has(file) && readFileSync(join(target, file), 'utf8') !== expected.get(file))
      .map((file) => `stale ${file}`),
  ];
  if (problems.length > 0) {
    console.error(`supabase/functions/_shared/core is out of date:\n  ${problems.join('\n  ')}\nRun npm run sync:core.`);
    process.exit(1);
  }
  console.log(`_shared/core matches packages/core (${expected.size} files).`);
} else {
  rmSync(target, { recursive: true, force: true });
  for (const [file, content] of expected) {
    mkdirSync(dirname(join(target, file)), { recursive: true });
    writeFileSync(join(target, file), content);
  }
  console.log(`Copied ${expected.size} files to supabase/functions/_shared/core.`);
}
