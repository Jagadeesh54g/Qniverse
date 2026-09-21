import dns from 'node:dns';
import mongoose from 'mongoose';
import { explainMongoError, isSrvDnsError, lintMongoUri } from './mongo-errors.mjs';

/**
 * One shared Mongoose connection for the whole app.
 * In dev, Next.js re-evaluates modules on every hot reload, so the connection
 * is cached on globalThis to avoid opening a new pool each time.
 */
const cache = globalThis.__qniverseMongo || (globalThis.__qniverseMongo = { conn: null, promise: null, dnsPatched: false });

function readUri() {
  // Read lazily (not at import time) so `next build` doesn't crash when the
  // variable is only available at runtime.
  const uri = String(process.env.MONGODB_URI || '').trim().replace(/^["']|["']$/g, '');
  if (!uri) {
    throw new Error('MONGODB_URI is not defined. Add it to .env.local and restart the dev server.');
  }
  if (!/^mongodb(\+srv)?:\/\//.test(uri)) {
    throw new Error('MONGODB_URI must start with mongodb:// or mongodb+srv://');
  }
  return uri;
}

function uriHasDatabase(uri) {
  return /^mongodb(?:\+srv)?:\/\/[^/?]+\/[^?]+/.test(uri);
}

function buildOptions(uri) {
  const options = {
    bufferCommands: false,
    serverSelectionTimeoutMS: 10000,
    maxPoolSize: 10,
  };
  // If the URI has no database name (…mongodb.net/?appName=…) MongoDB silently
  // uses "test". Default to "qniverse" instead unless the URI or MONGODB_DB says otherwise.
  const explicit = String(process.env.MONGODB_DB || '').trim();
  if (explicit) options.dbName = explicit;
  else if (!uriHasDatabase(uri)) options.dbName = 'qniverse';
  return options;
}

function patchDns(servers) {
  const list = servers.split(',').map((s) => s.trim()).filter(Boolean);
  if (!list.length) return;
  dns.setServers(list);
  cache.dnsPatched = true;
}

async function open() {
  const uri = readUri();
  const options = buildOptions(uri);

  if (process.env.MONGODB_DNS_SERVERS) patchDns(process.env.MONGODB_DNS_SERVERS);

  try {
    return await mongoose.connect(uri, options);
  } catch (error) {
    // Some ISPs/routers refuse SRV lookups (querySrv ECONNREFUSED). Retry once
    // with public DNS before giving up.
    if (uri.startsWith('mongodb+srv://') && isSrvDnsError(error) && !cache.dnsPatched) {
      console.warn('[Qniverse] SRV lookup failed with system DNS, retrying with 8.8.8.8 / 1.1.1.1 …');
      patchDns('8.8.8.8,1.1.1.1');
      return mongoose.connect(uri, options);
    }
    throw error;
  }
}

export async function connectDB() {
  if (cache.conn && mongoose.connection.readyState === 1) return cache.conn;

  if (!cache.promise) {
    cache.promise = open();
  }

  try {
    cache.conn = await cache.promise;
  } catch (error) {
    cache.promise = null;
    cache.conn = null;
    const hint = explainMongoError(error);
    console.error('[Qniverse] MongoDB connection failed:', error.message);
    if (hint) console.error('[Qniverse] Hint:', hint);
    for (const problem of lintMongoUri(process.env.MONGODB_URI)) console.error('[Qniverse] URI check:', problem);
    throw error;
  }

  return cache.conn;
}

export const db = connectDB;
