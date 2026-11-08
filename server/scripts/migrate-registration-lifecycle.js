if (require.main === module) require('dotenv').config({ quiet: true });
const mongoose = require('mongoose');
const { assertDevelopment } = require('./seed-events/safety');
const { ACTIVE, ACTIVE_INDEX, ACTIVE_KEYS, ACTIVE_PARTIAL, legacyUnique, replacementValid } = require('../src/utils/registrationLifecycle');
async function migrate(db, apply = false) {
    const registrations = db.collection('registrations');
    const indexes = await registrations.indexes();
    const invalid = await registrations.countDocuments({ status: { $exists: true, $nin: ['active', 'cancelled_by_student', 'cancelled_by_organizer', null] } });
    const duplicate = await registrations.aggregate([{ $match: ACTIVE }, { $group: { _id: { student: '$student', event: '$event' }, count: { $sum: 1 } } }, { $match: { count: { $gt: 1 } } }, { $limit: 1 }]).toArray();
    if (invalid || duplicate.length) throw new Error('Invalid lifecycle data or duplicate active registrations; no indexes removed');
    const counters = await db.collection('events').aggregate([{ $lookup: { from: 'registrations', let: { event: '$_id' }, pipeline: [{ $match: { ...ACTIVE, $expr: { $eq: ['$event', '$$event'] } } }, { $count: 'total' }], as: 'activeCount' } }, { $match: { $expr: { $ne: ['$registeredCount', { $ifNull: [{ $arrayElemAt: ['$activeCount.total', 0] }, 0] }] } } }, { $limit: 1 }]).toArray();
    if (counters.length) throw new Error('Seat counters need review; no indexes removed and no automatic repairs made');
    const existing = indexes.find(index => index.name === ACTIVE_INDEX);
    if (existing && !replacementValid(existing)) throw new Error('Replacement index name has unexpected options; no indexes removed');
    const legacy = indexes.filter(legacyUnique);
    if (apply) {
        await registrations.createIndex(ACTIVE_KEYS, { name: ACTIVE_INDEX, unique: true, partialFilterExpression: ACTIVE_PARTIAL });
        if (!(await registrations.indexes()).some(replacementValid)) throw new Error('Replacement index verification failed; no indexes removed');
        await db.collection('cancellationoutboxes').createIndex({ registration: 1, type: 1 }, { unique: true });
        for (const index of legacy) {
            const current = (await registrations.indexes()).find(item => item.name === index.name);
            if (!current || !legacyUnique(current)) throw new Error('Legacy index changed during migration; stopping');
            await registrations.dropIndex(index.name);
        }
        const final = await registrations.indexes();
        if (!final.some(replacementValid) || final.some(legacyUnique)) throw new Error('Lifecycle index migration is incomplete');
    }
    return { database: db.databaseName, apply, legacyIndexes: legacy.map(index => index.name), replacement: ACTIVE_INDEX, documentsRewritten: 0 };
}
let phase = 'configuration';
if (require.main === module) (async () => {
    assertDevelopment(process.env);
    if (!['--check', '--apply'].includes(process.argv[2]) || process.argv.length !== 3) throw new Error('Use --check or --apply');
    phase = 'connection';
    await mongoose.connect(process.env.MONGO_URI, { autoIndex: false, serverSelectionTimeoutMS: 10000 });
    if (mongoose.connection.name !== process.env.EVENTNEXUS_SEED_DB) throw new Error('Database name does not match the explicit development confirmation');
    phase = 'validation/index migration';
    console.log(JSON.stringify(await migrate(mongoose.connection.db, process.argv[2] === '--apply')));
})().catch(() => { console.error(`Lifecycle migration refused or unavailable during ${phase}. No document rewrites are performed. Connection details suppressed.`); process.exitCode = 1; }).finally(() => mongoose.disconnect());
module.exports = { migrate };
