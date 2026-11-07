class SeedSafetyError extends Error {}

function assertDevelopment(env) {
  if (env.NODE_ENV !== 'development') throw new SeedSafetyError('Refusing: NODE_ENV must already be development.');
  if ([env.APP_ENV, env.ENVIRONMENT, env.VERCEL_ENV].some(value => /prod|live/i.test(value || ''))) {
    throw new SeedSafetyError('Refusing: a production environment indicator is present.');
  }
  if (env.EVENTNEXUS_SEED_ALLOW !== 'development-only') {
    throw new SeedSafetyError('Refusing: set EVENTNEXUS_SEED_ALLOW=development-only for this development database.');
  }
  let url;
  try { url = new URL(env.MONGO_URI); } catch { throw new SeedSafetyError('Refusing: MONGO_URI must specify a valid MongoDB URI and database.'); }
  if (!['mongodb:', 'mongodb+srv:'].includes(url.protocol)) throw new SeedSafetyError('Refusing: unsupported database URI.');
  let database;
  try { database = decodeURIComponent(url.pathname.slice(1)); } catch { throw new SeedSafetyError('Refusing: invalid database name.'); }
  if (!/^[a-z\d_-]+$/i.test(database) || /prod|live/i.test(database) || ['admin', 'local', 'config'].includes(database.toLowerCase())) {
    throw new SeedSafetyError('Refusing: database must be explicit, non-system and non-production.');
  }
  if (env.EVENTNEXUS_SEED_DB !== database) throw new SeedSafetyError('Refusing: EVENTNEXUS_SEED_DB must exactly match the intended development database name.');
  if (env.EVENTNEXUS_SEED_PASSWORD && (env.EVENTNEXUS_SEED_PASSWORD.length < 12 || Buffer.byteLength(env.EVENTNEXUS_SEED_PASSWORD) > 72)) {
    throw new SeedSafetyError('Refusing: optional demo password must be at least 12 characters and at most 72 UTF-8 bytes.');
  }
  return database;
}

module.exports = { SeedSafetyError, assertDevelopment };
