import { cpSync, mkdirSync, existsSync, rmSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '..');
const publicDir = resolve(__dirname, 'public');
const adminDir = resolve(publicDir, 'admin');

// Ensure public directory exists
mkdirSync(publicDir, { recursive: true });
mkdirSync(adminDir, { recursive: true });

// Copy storefront files to public root
const storefrontDir = resolve(repoRoot, 'storefront_temp');
if (existsSync(storefrontDir)) {
  cpSync(storefrontDir, publicDir, {
    recursive: true,
    filter: (src) => !src.includes('vercel.json')
  });
  console.log('✓ Storefront copied to backend/public');
}

// Copy site_admin files to public/admin
const siteAdminDir = resolve(repoRoot, 'site_admin');
if (existsSync(siteAdminDir)) {
  cpSync(siteAdminDir, adminDir, {
    recursive: true,
    filter: (src) => !src.includes('vercel.json')
  });
  console.log('✓ Admin panel copied to backend/public/admin');
}
