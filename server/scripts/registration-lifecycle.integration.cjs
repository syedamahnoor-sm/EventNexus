// Explicitly local, unique disposable database. Never reads the project's .env.
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
async function run({ inspectBrowser } = {}) {
    const uri = new URL(process.env.EVENTNEXUS_TEST_MONGO_URI || '');
    assert.equal(uri.protocol, 'mongodb:'); assert.ok(['127.0.0.1', 'localhost'].includes(uri.hostname)); assert.equal(uri.username, ''); assert.equal(uri.password, '');
    const database = 'eventnexus_lifecycle_qa_' + crypto.randomUUID().replaceAll('-', ''), token = crypto.randomUUID();
    uri.pathname = '/' + database;
    process.env.MONGO_URI = uri.toString(); process.env.NODE_ENV = 'development'; process.env.SESSION_SECRET = crypto.randomBytes(32).toString('hex'); process.env.CLIENT_URL = 'http://localhost:5179';
    mongoose.set('autoIndex', false);
    const User = require('../src/models/User'), Event = require('../src/models/Event'), Registration = require('../src/models/Registration'), Outbox = require('../src/models/CancellationOutbox');
    const { ACTIVE, ACTIVE_INDEX } = require('../src/utils/registrationLifecycle');
    const { migrate } = require('./migrate-registration-lifecycle');
    let server, base, owned = false;
    const password = crypto.randomBytes(18).toString('hex');
    async function request(client, method, path, body, expected = 200, csrf = client.csrf, headers = {}) {
        const response = await fetch(base + path, { method, headers: { ...(client.cookie ? { Cookie: client.cookie } : {}), ...(body ? { 'Content-Type': 'application/json' } : {}), ...(csrf ? { 'X-CSRF-Token': csrf } : {}), ...headers }, body: body ? JSON.stringify(body) : undefined, signal: AbortSignal.timeout(30000) });
        for (const cookie of response.headers.getSetCookie()) client.cookie = cookie.split(';')[0];
        const data = await response.json(); if (data.csrfToken) client.csrf = data.csrfToken;
        assert.ok((Array.isArray(expected) ? expected : [expected]).includes(response.status), `${method} ${path} expected ${expected}, received ${response.status}`);
        return { ...data, httpStatus: response.status };
    }
    async function start() { delete require.cache[require.resolve('../src/app')]; server = require('../src/app').listen(0, 'localhost'); await new Promise(resolve => server.once('listening', resolve)); base = 'http://localhost:' + server.address().port + '/api'; }
    async function stop() { if (server) { server.closeIdleConnections(); await new Promise(resolve => server.close(resolve)); } }
    try {
        await mongoose.connect(process.env.MONGO_URI, { autoIndex: false, serverSelectionTimeoutMS: 10000 });
        assert.equal(mongoose.connection.name, database); assert.equal((await mongoose.connection.db.listCollections().toArray()).length, 0);
        await mongoose.connection.db.collection('qa_owner').insertOne({ token }); owned = true;
        await Registration.createCollection(); await Registration.collection.createIndex({ student: 1, event: 1 }, { unique: true }); await User.createIndexes(); await Outbox.createIndexes();
        const users = await User.create(['organizer', 'organizer', 'student', 'student'].map((role, i) => ({ name: ['Morgan Reed', 'Another Organizer', 'Rowan Student', 'Casey Student'][i], email: `lifecycle-${token}-${i}@eventnexus-seed.invalid`, password: bcrypt.hashSync(password, 12), role })));
        await start();
        const clients = [];
        for (const user of users) { const client = {}; await request(client, 'GET', '/auth/csrf-token'); await request(client, 'POST', '/auth/login', { email: user.email, password }); clients.push(client); }
        const [a, b, s, t] = clients;
        assert.equal((await request(s, 'GET', '/auth/me')).user.id, String(users[2]._id));
        const payload = title => ({ title, description: 'Temporary lifecycle integration event. No existing development records are used.', category: 'Workshops', date: new Date(Date.now() + 86400000 * 7).toISOString(), location: 'Student Design Studio', capacity: 2 });
        const event = (await request(a, 'POST', '/events', payload('Campus Workshop Together'), 201)).event;
        let legacy;
        await mongoose.connection.transaction(async session => { [legacy] = await Registration.create([{ student: users[3]._id, event: event._id }], { session }); await Event.updateOne({ _id: event._id }, { $inc: { registeredCount: 1 } }, { session }); });
        const types = ['short_text', 'long_text', 'single_choice', 'multiple_choice', 'dropdown'];
        const questions = types.map((type, order) => ({ id: crypto.randomUUID(), text: ['What would you like to learn?', 'Tell us about your campus idea.', 'Choose a session.', 'What will you bring?', 'Choose your level.'][order], type, required: true, order, options: order < 2 ? [] : [{ id: crypto.randomUUID(), label: 'Original first option' }, { id: crypto.randomUUID(), label: 'Original second option' }] }));
        await request(a, 'PATCH', '/events/' + event._id, { registrationQuestions: questions }, 200, a.csrf, { 'X-Event-Version': '0', 'X-Confirm-Question-Changes': 'true' });
        const attendee = { fullName: users[2].name, email: 'submitted-student@campus.example', studentId: 'DES / 204', department: 'Creative Technology', studyStage: 'Year 2' };
        const answerSet = definitions => definitions.map(q => ({ questionId: q.id, value: q.options.length ? q.type === 'multiple_choice' ? q.options.map(o => o.id) : q.options[0].id : q.type === 'long_text' ? 'A thoughtful campus idea.\nA second line.' : 'Learning together' }));
        let form = { attendee, answers: answerSet(questions), questionVersion: 1 };
        const first = (await request(s, 'POST', '/events/' + event._id + '/register', form, 201)).data;
        const target = '/events/' + event._id + '/registrations/' + first._id + '/cancel';
        await request(a, 'POST', target, { confirmed: true, reason: 'A valid reason before migration' }, 503);
        assert.equal((await Event.findById(event._id)).registeredCount, 2); assert.equal(await Outbox.countDocuments(), 0);
        const before = JSON.stringify(await Registration.find().sort({ _id: 1 }).lean()); await migrate(mongoose.connection.db, false); await migrate(mongoose.connection.db, true); assert.equal(JSON.stringify(await Registration.find().sort({ _id: 1 }).lean()), before);
        const indexes = await Registration.collection.indexes(); assert.ok(indexes.some(i => i.name === ACTIVE_INDEX)); assert.equal(indexes.some(i => i.name === 'student_1_event_1'), false);
        await assert.rejects(Registration.create({ event: event._id, student: users[3]._id, status: 'active' }), { code: 11000 });
        for (const body of [{}, { confirmed: true }, { reason: 'Clear reason' }, { confirmed: true, reason: 'x' }, { confirmed: true, reason: 'x'.repeat(501) }, { confirmed: true, reason: 'Clear reason', actor: String(users[1]._id) }]) await request(a, 'POST', target, body, 400);
        await request(b, 'POST', target, { confirmed: true, reason: 'Another owner cannot do this' }, 403); await request(s, 'POST', target, { confirmed: true, reason: 'A student cannot do this' }, 403); await request(a, 'POST', target, { confirmed: true, reason: 'CSRF is still required' }, 403, 'invalid'); await request({}, 'POST', target, { confirmed: true, reason: 'Session is required' }, 403);
        const cancelled = await Promise.all([request(a, 'POST', target, { confirmed: true, reason: 'The venue changed its availability.' }), request(a, 'POST', target, { confirmed: true, reason: 'A simultaneous cancellation request.' })]);
        assert.equal(cancelled.filter(r => r.alreadyCancelled).length, 1); assert.equal((await Event.findById(event._id)).registeredCount, 1); assert.equal(await Outbox.countDocuments({ registration: first._id }), 1);
        const saved = await Registration.findById(first._id).lean(); assert.equal(saved.status, 'cancelled_by_organizer'); assert.deepEqual(saved.answers, first.answers); assert.equal(String(saved.cancellation.actor), String(users[0]._id));
        const lookup = (await request(s, 'GET', '/events/' + event._id + '/registration')).data; assert.equal(lookup.status, 'cancelled_by_organizer'); assert.equal(lookup.cancellation.reason, saved.cancellation.reason); assert.equal(lookup.cancellation.actor, undefined); assert.equal(lookup.cancellation.previousStatus, undefined);
        const roster = await request(a, 'GET', '/events/' + event._id + '/registrations'); assert.equal(roster.total, 1); assert.equal(roster.rosterTotal, 2); assert.equal(roster.activeTotal, 1);
        assert.equal((await request(a, 'GET', '/events/' + event._id + '/registrations?status=cancelled_by_organizer&search=Rowan')).total, 1);
        assert.equal((await request(a, 'GET', '/events/' + event._id + '/registrations?status=all&limit=1')).pagination.totalPages, 2);
        const race = await Promise.all([request(s, 'POST', '/events/' + event._id + '/register', form, [201, 409]), request(s, 'POST', '/events/' + event._id + '/register', form, [201, 409])]); assert.equal(race.filter(r => r.httpStatus === 201).length, 1); const second = race.find(r => r.httpStatus === 201).data; assert.notEqual(second._id, first._id);
        await request(s, 'DELETE', '/events/' + event._id + '/register', { registrationId: first._id }); assert.equal((await Registration.findById(second._id)).status, 'active'); assert.equal((await Event.findById(event._id)).registeredCount, 2);
        await request(s, 'DELETE', '/events/' + event._id + '/register', { registrationId: second._id }); await request(s, 'DELETE', '/events/' + event._id + '/register', { registrationId: second._id }); assert.equal((await Event.findById(event._id)).registeredCount, 1); assert.equal(await Outbox.countDocuments({ registration: second._id }), 1);
        await Promise.all([request(a, 'POST', '/events/' + event._id + '/registrations/' + legacy._id + '/cancel', { confirmed: true, reason: 'A legacy registration, safely cancelled.' }), request(t, 'DELETE', '/events/' + event._id + '/register', { registrationId: String(legacy._id) })]);
        assert.equal((await Event.findById(event._id)).registeredCount, 0); assert.equal(await Outbox.countDocuments(), 3); assert.equal(await Registration.countDocuments({ event: event._id, ...ACTIVE }), 0);
        const changed = structuredClone(questions); changed[0].text = 'A new question for future registrations'; changed[2].options[0].label = 'A new option label';
        await request(a, 'PATCH', '/events/' + event._id, { registrationQuestions: changed, capacity: 1 }, 200, a.csrf, { 'X-Event-Version': '1', 'X-Confirm-Question-Changes': 'true' }); assert.deepEqual((await Registration.findById(first._id).lean()).answers, first.answers);
        form = { attendee, answers: answerSet(changed), questionVersion: 2 };
        const fourth = (await request(s, 'POST', '/events/' + event._id + '/register', form, 201)).data;
        const createOutbox = Outbox.create; let outboxFailureReached = false; Outbox.create = async () => { outboxFailureReached = true; throw new Error('Intentional QA outbox failure'); };
        try { await request(a, 'POST', '/events/' + event._id + '/registrations/' + fourth._id + '/cancel', { confirmed: true, reason: 'Rollback must preserve the active seat.' }, 500); } finally { Outbox.create = createOutbox; }
        assert.equal(outboxFailureReached, true);
        assert.equal((await Registration.findById(fourth._id)).status, 'active'); assert.equal((await Event.findById(event._id)).registeredCount, 1); assert.equal(await Outbox.countDocuments({ registration: fourth._id }), 0);
        const other = (await request(b, 'POST', '/events', payload('Another Organizer Event'), 201)).event;
        await request(a, 'POST', '/events/' + event._id + '/registrations/' + new mongoose.Types.ObjectId() + '/cancel', { confirmed: true, reason: 'No association can be forged.' }, 404); await request(a, 'POST', '/events/' + other._id + '/registrations/' + fourth._id + '/cancel', { confirmed: true, reason: 'Not the owner of this event.' }, 403);
        const competing = (await request(a, 'POST', '/events', { ...payload('Seat and Cancellation Race'), capacity: 1 }, 201)).event;
        const one = (await request(s, 'POST', '/events/' + competing._id + '/register', { attendee }, 201)).data;
        const [, contender] = await Promise.all([request(a, 'POST', '/events/' + competing._id + '/registrations/' + one._id + '/cancel', { confirmed: true, reason: 'Release the final seat safely.' }), request(t, 'POST', '/events/' + competing._id + '/register', { attendee: { ...attendee, fullName: users[3].name } }, [201, 409])]);
        if (contender.httpStatus === 409) await request(t, 'POST', '/events/' + competing._id + '/register', { attendee }, 201);
        assert.equal((await Event.findById(competing._id)).registeredCount, 1); assert.equal(await Registration.countDocuments({ event: competing._id, ...ACTIVE }), 1);
        const past = (await request(a, 'POST', '/events', payload('Past Boundary Fixture'), 201)).event; const pastReg = (await request(s, 'POST', '/events/' + past._id + '/register', { attendee }, 201)).data; await Event.updateOne({ _id: past._id }, { $set: { date: new Date(0) } }); await request(a, 'POST', '/events/' + past._id + '/registrations/' + pastReg._id + '/cancel', { confirmed: true, reason: 'Past registrations cannot be cancelled.' }, 409); await request(s, 'DELETE', '/events/' + past._id + '/register', { registrationId: pastReg._id }, 409);
        const closed = (await request(a, 'POST', '/events', payload('Cancelled Event Fixture'), 201)).event; const closedReg = (await request(s, 'POST', '/events/' + closed._id + '/register', { attendee }, 201)).data; await request(a, 'POST', '/events/' + closed._id + '/cancel', {}, 200, a.csrf, { 'X-Event-Version': '0' }); await request(a, 'POST', '/events/' + closed._id + '/registrations/' + closedReg._id + '/cancel', { confirmed: true, reason: 'The event is no longer open.' }, 409);
        console.log('PASS real local MongoDB/API: verified index replacement without document rewrites; legacy uniqueness; reason/confirmation/roles/ownership/CSRF; repeated and concurrent cancellations; re-registration and stale references; seat/enrollment races; outbox failure rollback; active counts/filters/pages; unchanged answer snapshots; student privacy; past/cancelled-event guards');
        if (inspectBrowser) { await stop(); await start(); await inspectBrowser({ base, users, clients, event: await Event.findById(event._id).lean(), registration: fourth, password, request, models: { Event, Registration, Outbox } }); }
        return { passed: true };
    } finally {
        await stop();
        if (owned) { assert.equal(mongoose.connection.name, database); assert.equal((await mongoose.connection.db.collection('qa_owner').findOne({ token }))?.token, token); await mongoose.connection.dropDatabase(); console.log('PASS exact local fixture cleanup: unique test database removed; Atlas and development seed records never connected or modified'); }
        await mongoose.disconnect();
    }
}
if (require.main === module) run().catch(error => { console.error('Lifecycle integration failed:', error.message); process.exitCode = 1; }).finally(() => process.exit(process.exitCode || 0));
module.exports = { run };
