
/*
* Runs the correct Prisma deployment command based on DATABASE_URL:
*   PostgreSQL  →  prisma migrate deploy  (applies pending migrations)
*   MongoDB     →  prisma db push         (pushes schema to DB, no migrations)
*
*/

require('dotenv').config();

const { execSync } = require('child_process');

const url = process.env.DATABASE_URL || '';

if (!url)
{
  console.error('[DB Deploy] ❌ DATABASE_URL is not set.');
  process.exit(1);
}

const isMongo = url.startsWith('mongodb://') || url.startsWith('mongodb+srv://');

const command = isMongo
  ? 'npx prisma db push --accept-data-loss'
  : 'npx prisma migrate deploy';

console.log(`[DB Deploy] Provider: ${isMongo ? 'mongodb' : 'postgresql'}`);
console.log(`[DB Deploy] Running: ${command}`);

try
{
  execSync(command, { stdio: 'inherit' });
  console.log('[DB Deploy] ✅ Done.');
} catch (err)
{
  console.error('[DB Deploy] ❌ Failed:', err.message);
  process.exit(1);
}
