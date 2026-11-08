const test = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const Registration = require('../src/models/Registration');
const Event = require('../src/models/Event');
const Outbox = require('../src/models/CancellationOutbox');
const { ACTIVE, ACTIVE_INDEX, ACTIVE_KEYS, ACTIVE_PARTIAL, isActive, studentRegistration, assertLifecycleReady } = require('../src/utils/registrationLifecycle');
const { organizerCancellation, studentCancellation } = require('../src/validators/cancellationValidation');
const { cancelRegistrationRecord } = require('../src/utils/cancelRegistrationRecord');
const { migrate } = require('./migrate-registration-lifecycle');
const replacement = { name: ACTIVE_INDEX, key: ACTIVE_KEYS, partialFilterExpression: ACTIVE_PARTIAL, unique: true };
const legacy = { name: 'student_1_event_1', key: ACTIVE_KEYS, unique: true };

test('legacy activity and student serialization preserve answers but omit internal cancellation actors', () => {
    for (const status of [undefined, null, 'active']) assert.equal(isActive({ status }), true);
    for (const status of ['cancelled_by_student', 'cancelled_by_organizer']) assert.equal(isActive({ status }), false);
    const source = { _id: 'ref', student: 'private-student', status: 'cancelled_by_organizer', answers: [{ questionText: 'Original' }], cancellation: { actor: 'private-actor', initiator: 'organizer', previousStatus: 'active', resultingStatus: 'cancelled_by_organizer', at: new Date(), reason: 'A clear reason' } };
    const result = studentRegistration(source); assert.equal(result.student, undefined); assert.equal(result.cancellation.actor, undefined); assert.equal(result.cancellation.initiator, undefined); assert.equal(result.cancellation.resultingStatus, undefined); assert.equal(result.cancellation.reason, 'A clear reason'); assert.deepEqual(result.answers, source.answers); assert.equal(source.cancellation.actor, 'private-actor'); assert.equal(studentRegistration({ _id: 'legacy' }).status, 'active');
});
test('organizer consent and reasons are mandatory, bounded and never allow client identity', () => {
    assert.deepEqual(organizerCancellation.parse({ confirmed: true, reason: '  Scheduling conflict  ' }), { confirmed: true, reason: 'Scheduling conflict' });
    for (const payload of [{ reason: 'Clear reason' }, { confirmed: false, reason: 'Clear reason' }, { confirmed: true }, { confirmed: true, reason: ' ' }, { confirmed: true, reason: 'x'.repeat(501) }, { confirmed: true, reason: '<script>bad</script>' }, { confirmed: true, reason: 'Clear reason', actor: 'someone' }]) assert.equal(organizerCancellation.safeParse(payload).success, false);
    const id = String(new mongoose.Types.ObjectId()); assert.equal(studentCancellation.safeParse({ registrationId: id }).success, true); assert.equal(studentCancellation.safeParse({}).success, false); assert.equal(studentCancellation.safeParse({ registrationId: id, reason: 'not supported' }).success, false);
});
test('model validation requires coherent audit metadata and retains legacy seed shape', async () => {
    const student = new mongoose.Types.ObjectId(), event = new mongoose.Types.ObjectId(), actor = new mongoose.Types.ObjectId();
    const old = new Registration({ student, event }); await old.validate(); assert.equal(old.toObject().status, undefined); assert.equal(old.toObject().cancellation, undefined);
    for (const status of ['cancelled_by_student', 'cancelled_by_organizer']) {
        await assert.rejects(new Registration({ student, event, status }).validate());
        const cancellation = { initiator: status.endsWith('student') ? 'student' : 'organizer', actor, at: new Date(), previousStatus: 'active', resultingStatus: status, ...(status.endsWith('organizer') ? { reason: 'An appropriate event reason' } : {}) };
        await new Registration({ student, event, status, cancellation }).validate();
        await assert.rejects(new Registration({ student, event, status: 'active', cancellation }).validate());
    }
    assert.equal(Registration.schema.path('answers').options.immutable, true);
    assert.ok(Registration.schema.indexes().some(([keys, options]) => JSON.stringify(keys) === JSON.stringify(ACTIVE_KEYS) && options.name === ACTIVE_INDEX && JSON.stringify(options.partialFilterExpression) === JSON.stringify(ACTIVE)));
    assert.ok(Outbox.schema.indexes().some(([, options]) => options.unique));
});
test('writes are blocked until the replacement is verified and the old full unique index is absent', async () => {
    for (const indexes of [[], [legacy], [legacy, replacement], [{ ...replacement, unique: false }]]) await assert.rejects(assertLifecycleReady({ indexes: async () => indexes }), { status: 503 });
    await assertLifecycleReady({ indexes: async () => [replacement] });
});
test('migration builds and validates replacement before dropping only the exact legacy index; dry run writes nothing', async () => {
    let indexes = [legacy, { name: '_id_', key: { _id: 1 } }], actions = [];
    const collection = { indexes: async () => indexes, countDocuments: async () => 0, aggregate: () => ({ toArray: async () => [] }), createIndex: async (keys, options) => { actions.push('build'); indexes.push({ key: keys, ...options }); }, dropIndex: async name => { assert.ok(indexes.some(i => i.name === ACTIVE_INDEX)); actions.push(name); indexes = indexes.filter(i => i.name !== name); } };
    const db = { databaseName: 'unit-fixture', collection: () => collection };
    await migrate(db); assert.deepEqual(actions, []); await migrate(db, true); assert.deepEqual(actions, ['build', 'build', legacy.name]); assert.ok(indexes.some(i => i.name === '_id_'));
    actions = []; await migrate(db, true); assert.deepEqual(actions, ['build', 'build']);
    collection.countDocuments = async () => 1; actions = []; await assert.rejects(migrate(db, true)); assert.deepEqual(actions, []);
});
test('migration refuses to remove constraints when replacement validation fails', async () => {
    let dropped = false;
    const collection = { indexes: async () => [legacy], countDocuments: async () => 0, aggregate: () => ({ toArray: async () => [] }), createIndex: async () => {}, dropIndex: async () => { dropped = true; } };
    await assert.rejects(migrate({ collection: () => collection }, true)); assert.equal(dropped, false);
});
test('cancellation service uses one transaction/session for seat, retained record and durable event; repeat is read-only', async t => {
    const actor = new mongoose.Types.ObjectId(), student = new mongoose.Types.ObjectId(), eventId = new mongoose.Types.ObjectId(), registrationId = new mongoose.Types.ObjectId();
    const session = {}, writes = [], savedAnswers = [{ questionText: 'An original question', answerText: 'An original response' }];
    const event = { _id: eventId, organizer: actor, date: new Date(Date.now() + 86400000), status: 'upcoming' };
    const record = { _id: registrationId, student, event: eventId, answers: savedAnswers, async save(options) { assert.equal(options.session, session); writes.push('save'); } };
    t.mock.method(Registration.collection, 'indexes', async () => [replacement]);
    t.mock.method(mongoose.connection, 'transaction', async run => run(session));
    t.mock.method(Event, 'findById', () => ({ session: async s => { assert.equal(s, session); return event; } }));
    t.mock.method(Registration, 'findOne', filter => ({ session: async () => filter.student && String(filter.student) !== String(student) ? null : record }));
    t.mock.method(Registration, 'findOneAndUpdate', async (filter, update, options) => { assert.equal(options.session, session); assert.deepEqual(filter.status, ACTIVE.status); record.status = update.$set.status; record.cancellation = update.$set.cancellation; writes.push('status'); return record; });
    t.mock.method(Event, 'updateOne', async (filter, update, options) => { assert.equal(options.session, session); assert.equal(update.$inc.registeredCount, -1); assert.deepEqual(filter.registeredCount, { $gt: 0 }); writes.push('seat'); return { modifiedCount: 1 }; });
    t.mock.method(Outbox, 'create', async (rows, options) => { assert.equal(options.session, session); assert.equal(rows[0].actor, actor); assert.equal(rows[0].previousStatus, 'active'); assert.equal(rows[0].resultingStatus, 'cancelled_by_organizer'); writes.push('outbox'); });
    const args = { eventId, registrationId, actor, initiator: 'organizer', reason: 'Session rescheduled by the venue' };
    await assert.rejects(cancelRegistrationRecord({ ...args, reason: undefined }), { status: 400 }); assert.equal(writes.length, 0);
    const result = await cancelRegistrationRecord(args); assert.equal(result.registration.status, 'cancelled_by_organizer'); assert.equal(record.cancellation.actor, actor); assert.deepEqual(record.answers, savedAnswers); assert.deepEqual(writes, ['seat', 'status', 'outbox']);
    const repeat = await cancelRegistrationRecord({ ...args, reason: 'Must not overwrite the original' }); assert.equal(repeat.alreadyCancelled, true); assert.equal(record.cancellation.reason, args.reason); assert.equal(writes.length, 3);
    await assert.rejects(cancelRegistrationRecord({ ...args, actor: new mongoose.Types.ObjectId() }), { status: 403 }); assert.equal(writes.length, 3);
    record.status = 'active'; delete record.cancellation; event.date = new Date(0); await assert.rejects(cancelRegistrationRecord(args), { status: 409 }); assert.equal(writes.length, 3);
    event.date = new Date(Date.now() + 86400000); await assert.rejects(cancelRegistrationRecord({ ...args, actor, initiator: 'student' }), { status: 404 }); assert.equal(writes.length, 3);
});
