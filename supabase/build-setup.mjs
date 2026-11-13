// Builds supabase/setup.sql: every migration, in order, as ONE file to paste into the
// Supabase SQL editor on a fresh project.   Usage:  node supabase/build-setup.mjs
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const dir = resolve(root, 'migrations');
const files = readdirSync(dir).filter((f) => /^\d{4}_.+\.sql$/.test(f)).sort();

const header = `-- =====================================================================
-- Baytak Noor store: COMPLETE database setup (one file, run once)
--
-- HOW TO USE
--   1. Create a NEW, EMPTY Supabase project (do not run this on a project that
--      already holds data - it creates tables and will fail if they exist).
--   2. Supabase dashboard -> SQL Editor -> New query -> paste this whole file -> Run.
--   3. Then follow the "after the script" steps in DEPLOY.md.
--
-- Generated from supabase/migrations/${files[0]} .. ${files[files.length - 1]}
-- by supabase/build-setup.mjs. Edit the migrations, then rebuild; do not hand-edit.
-- =====================================================================

`;

const body = files
  .map((f) => `-- ---------------------------------------------------------------------\n-- ${f}\n-- ---------------------------------------------------------------------\n${readFileSync(resolve(dir, f), 'utf8').trim()}\n`)
  .join('\n');

writeFileSync(resolve(root, 'setup.sql'), header + body, 'utf8');
console.log(`setup.sql written from ${files.length} migrations`);
