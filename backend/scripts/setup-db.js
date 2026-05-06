/**
 * scripts/setup-db.js
 *
 * Detects the database provider from DATABASE_URL and copies the correct
 * Prisma schema to prisma/schema.prisma before running prisma generate.
 *
 * Supported databases:
 *   PostgreSQL  →  DATABASE_URL starts with postgresql:// or postgres://
 *   MongoDB     →  DATABASE_URL starts with mongodb:// or mongodb+srv://
 *
 * Usage:
 *   node scripts/setup-db.js
 */

require('dotenv').config();

const fs   = require('fs');
const path = require('path');

const url = process.env.DATABASE_URL || '';

if (!url) {
  console.error('[DB Setup] ❌ DATABASE_URL is not set.');
  process.exit(1);
}

const isMongo = url.startsWith('mongodb://') || url.startsWith('mongodb+srv://');
const isPostgres = url.startsWith('postgresql://') || url.startsWith('postgres://');

if (!isMongo && !isPostgres) {
  console.error(
    '[DB Setup] ❌ Unrecognised DATABASE_URL protocol.\n' +
    '  Expected: postgresql://, postgres://, mongodb://, or mongodb+srv://\n' +
    `  Got:      ${url.split('://')[0]}://...`
  );
  process.exit(1);
}

const provider    = isMongo ? 'mongodb' : 'postgresql';
const sourceFile  = isMongo ? 'schema.mongodb.prisma' : 'schema.postgresql.prisma';
const prismaDir   = path.join(__dirname, '..', 'prisma');
const sourcePath  = path.join(prismaDir, sourceFile);
const destPath    = path.join(prismaDir, 'schema.prisma');

if (!fs.existsSync(sourcePath)) {
  console.error(`[DB Setup] ❌ Source schema not found: ${sourcePath}`);
  process.exit(1);
}

fs.copyFileSync(sourcePath, destPath);

console.log(`[DB Setup] ✅ Provider detected: ${provider}`);
console.log(`[DB Setup] ✅ Copied ${sourceFile} → schema.prisma`);
