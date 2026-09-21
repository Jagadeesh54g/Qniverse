// Shared by lib/mongodb.js (Next.js) and scripts/check-db.mjs (plain Node).
// Kept as .mjs so both can import it regardless of package "type".

export function isSrvDnsError(error) {
  const text = `${error?.message || ''} ${error?.syscall || ''}`;
  return /querySrv|queryTxt/i.test(text);
}

/**
 * Turns a raw MongoDB/Mongoose error into a short, actionable hint.
 * Returns null when nothing specific is known.
 */
export function explainMongoError(error) {
  const message = String(error?.message || error || '');

  if (/MONGODB_URI is not defined|MONGODB_URI must start/i.test(message)) {
    return message;
  }
  if (/bad auth|authentication failed|AuthenticationFailed/i.test(message)) {
    return 'MongoDB rejected the username/password. Use the Database Access user (not your Atlas login) and URL-encode special characters in the password (@ becomes %40, # becomes %23, / becomes %2F).';
  }
  if (/querySrv|queryTxt/i.test(message)) {
    return 'DNS could not resolve the Atlas SRV record. Your network/ISP DNS is probably blocking it. Set MONGODB_DNS_SERVERS=8.8.8.8,1.1.1.1 in .env.local, or use the non-SRV "standard connection string" from Atlas (Connect > Drivers > older driver version).';
  }
  if (/ENOTFOUND/i.test(message)) {
    return 'The cluster hostname does not exist or DNS is failing. Re-copy the connection string from Atlas.';
  }
  if (/ECONNREFUSED\s+(127\.0\.0\.1|::1|localhost)/i.test(message)) {
    return 'Nothing is listening on the local MongoDB port. Start mongod, or switch MONGODB_URI to your Atlas connection string.';
  }
  if (/isn't whitelisted|Could not connect to any servers|ReplicaSetNoPrimary|Server selection timed out|timed out/i.test(message)) {
    return 'Atlas is not accepting connections from this machine. In Atlas go to Security > Network Access > Add IP Address and add your current IP (or 0.0.0.0/0 while developing). Also make sure the cluster is not paused.';
  }
  if (/ssl|tls|alert number|ERR_SSL/i.test(message)) {
    return 'TLS handshake failed. This is usually Atlas blocking your IP (see Network Access), or an antivirus/VPN/proxy intercepting the connection.';
  }
  return null;
}

/**
 * Static checks on the connection string itself. Returns a list of problems
 * (empty list = nothing obviously wrong). Never includes the password.
 */
export function lintMongoUri(uri) {
  const problems = [];
  const value = String(uri || '');
  if (/[<>]/.test(value)) {
    problems.push('The URI still has a <placeholder> in it. Replace the whole <db_password> part, including the < and >, with the real password.');
  }
  const authority = value.replace(/^mongodb(?:\+srv)?:\/\//, '').split('?')[0];
  const beforePath = authority.split('/')[0];
  if ((beforePath.match(/@/g) || []).length > 1) {
    problems.push('The password contains a raw "@". URL-encode it as %40 (and # as %23, / as %2F, : as %3A).');
  }
  if (/\s/.test(value)) {
    problems.push('The URI contains whitespace. Remove spaces/line breaks from MONGODB_URI.');
  }
  if (/^mongodb(?:\+srv)?:\/\/[^/?]+\/?(\?|$)/.test(value)) {
    problems.push('No database name in the URI (…mongodb.net/?…). Qniverse now defaults to "qniverse"; add /qniverse before the "?" or set MONGODB_DB to be explicit.');
  }
  return problems;
}
