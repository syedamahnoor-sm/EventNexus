const path = require('node:path');
const mongoose = require('mongoose');
const { assertDevelopment, SeedSafetyError } = require('./seed-events/safety');
const { BATCH_ID, DISTRIBUTION, buildCatalog } = require('./seed-events/catalog');

async function main() {
  
  require('dotenv').config({ path: path.join(__dirname, '../.env'), quiet: true });
  const mode = process.argv[2] || 'seed';
  if (!['seed', 'cleanup', 'verify', 'images', 'archive', 'archive-cleanup', 'archive-verify'].includes(mode) || process.argv.length > 3) throw new SeedSafetyError('Unsupported seed command; unexpected arguments are refused.');
  const database = assertDevelopment(process.env);
  const connectDB = require('../src/config/db');
  const { seed, cleanup, attachPhotos, inspect, Manifest } = require('./seed-events/store');
  await connectDB({ throwOnError: true });
  if (mongoose.connection.db.databaseName !== database) throw new SeedSafetyError('Refusing: connected database does not match the confirmed database.');
  const hello = await mongoose.connection.db.admin().command({ hello: 1 });
  if (!hello.setName && hello.msg !== 'isdbgrid') throw new SeedSafetyError('A transaction-capable MongoDB replica set or sharded cluster is required. No sample records written.');
  // Create collections/indexes before a transaction, never bypass schema validation.
  const User = require('../src/models/User');
  const Event = require('../src/models/Event');
  const Registration = require('../src/models/Registration');
  await Promise.all([User.init(), Event.init(), Registration.init(), Manifest.init()]);
  if (mode.startsWith('archive')) {
    const { seedHistorical, cleanupHistorical, verifyHistorical } = require('./seed-events/historical');
    if (mode === 'archive') console.log('Historical development cohort:', JSON.stringify(await seedHistorical()));
    else if (mode === 'archive-cleanup') console.log('Removed only archive-owned records:', JSON.stringify(await cleanupHistorical()));
    else await verifyHistorical();
  } else if (mode === 'seed') {
    const result = await seed();
    console.log(`${result.created ? 'Created' : 'Preserved existing cohort:'} ${result.events} sample events, ${result.users} sample users, ${result.registrations} tracked registrations.`);
    console.log('Category distribution:', JSON.stringify(DISTRIBUTION));
    if (!result.created) console.log('Photo attachment:', JSON.stringify({ imagesUpdated: result.imagesUpdated, customImagesPreserved: result.customImagesPreserved }));
    console.log('Existing cohorts retain dates and test activity. Cleanup + seed creates a fresh relative-date cohort.');
  } else if (mode === 'images') {
    console.log('Photo-only update:', JSON.stringify(await attachPhotos()));
  } else if (mode === 'cleanup') {
    console.log('Removed only manifest-owned records:', JSON.stringify(await cleanup()));
  } else {
    let snapshot;
    await mongoose.connection.transaction(async session => {
      const manifest = await Manifest.findById(BATCH_ID).session(session).lean();
      if (!manifest) throw new SeedSafetyError('No tracked seed cohort found. Run seed:events first.');
      snapshot = await inspect(manifest, session);
    });
    const { verifyApi } = require('./seed-events/verify-api');
    await verifyApi(snapshot.events);
    console.log('PASS database references, registration counts and API verification');
  }
}

if (require.main === module) {
  main().catch(error => {
    // Driver/validation errors can include connection strings or document values. Never echo them.
    console.error(error instanceof SeedSafetyError ? error.message : error.code === 11000 ? 'Seed refused: unique-record conflict. Existing records were not overwritten; retry after inspection.' : 'Seed operation failed; any active transaction was rolled back. Connection/document details suppressed. Check development database access and transaction support.');
    process.exitCode = 1;
  }).finally(async () => {
    try { await mongoose.disconnect(); } catch { console.error('Database disconnect failed; details suppressed.'); process.exitCode = 1; }
  });
}

module.exports = { main, buildCatalog };
