require('dotenv').config();

const { PrismaClient } = require('@prisma/client');

// Detect provider
const rawUrl = process.env.DATABASE_URL || '';
const isMongo = rawUrl.startsWith('mongodb://') || rawUrl.startsWith('mongodb+srv://');
const DB_PROVIDER = isMongo ? 'mongodb' : 'postgresql';

console.log(`[DB] Provider: ${DB_PROVIDER}`);


const buildUrl = () =>
{
  if (!rawUrl) throw new Error('DATABASE_URL environment variable is not set');
  if (isMongo) return rawUrl;


  const sep = rawUrl.includes('?') ? '&' : '?';
  const hasPooling = rawUrl.includes('connection_limit') || rawUrl.includes('pool_timeout');
  return hasPooling
    ? rawUrl
    : `${rawUrl}${sep}connection_limit=5&pool_timeout=20&connect_timeout=15`;
};


const prisma = new PrismaClient({
  datasources: { db: { url: buildUrl() } },
  log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
});


const MAX_RETRIES = 3;
const RETRY_BASE_MS = 1000;

const isConnectionError = (err) =>
  err?.message?.includes("Can't reach database") ||
  err?.message?.includes('ECONNREFUSED') ||
  err?.message?.includes('connect ETIMEDOUT') ||
  ['P1001', 'P1002', 'P1008'].includes(err?.code);

const withRetry = async (operation, retries = MAX_RETRIES) =>
{
  for (let attempt = 1; attempt <= retries; attempt++)
  {
    try
    {
      return await operation();
    } catch (err)
    {
      if (isConnectionError(err) && attempt < retries)
      {
        const delay = RETRY_BASE_MS * attempt;
        console.warn(`[DB] Attempt ${attempt} failed — retrying in ${delay}ms...`);
        await new Promise((r) => setTimeout(r, delay));
        try { await prisma.$connect(); } catch (_) { }
        continue;
      }
      throw err;
    }
  }
};

prisma.$withRetry = withRetry;
prisma.$dbProvider = DB_PROVIDER;
prisma.$isMongo = isMongo;


let keepAliveInterval;

const ping = async () =>
{
  try
  {
    if (isMongo)
    {
      await prisma.$runCommandRaw({ ping: 1 });
    } else
    {
      await prisma.$queryRawUnsafe('SELECT 1');
    }
  } catch (err)
  {
    console.warn('[DB] Keep-alive ping failed:', err.message);
    try { await prisma.$connect(); } catch (_) { }
  }
};

const startKeepAlive = () =>
{
  keepAliveInterval = setInterval(ping, 4 * 60 * 1000);
  keepAliveInterval.unref?.();
};

const connectWithRetry = async (maxAttempts = 5) =>
{
  for (let i = 1; i <= maxAttempts; i++)
  {
    try
    {
      await prisma.$connect();
      console.log(`[DB] Connected (${DB_PROVIDER})`);
      startKeepAlive();
      return;
    } catch (err)
    {
      console.error(`[DB] Connect attempt ${i}/${maxAttempts} failed:`, err.message);
      if (i < maxAttempts) await new Promise((r) => setTimeout(r, 2000 * i));
    }
  }
  console.error('[DB] Could not connect at startup. Requests will retry.');
};

connectWithRetry().catch((err) =>
{
  console.error('[DB] Fatal startup error:', err.message);
});

process.on('beforeExit', async () =>
{
  clearInterval(keepAliveInterval);
  await prisma.$disconnect();
});

module.exports = prisma;
