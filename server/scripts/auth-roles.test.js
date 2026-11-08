const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../src/models/User');
const { loginUser } = require('../src/controllers/authController');
const { loginSchema, registerSchema } = require('../src/validators/authValidation');

test('login accepts only known role assertions; public signup never accepts roles', () => {
    const values = { email: 'test@example.edu', password: crypto.randomUUID() };
    for (const role of ['student', 'organizer']) assert.equal(loginSchema.safeParse({ ...values, role }).success, true);
    assert.equal(loginSchema.safeParse(values).success, true); // Older API clients remain compatible.
    for (const role of ['admin', '', { $ne: 'student' }, ['organizer'], null]) assert.equal(loginSchema.safeParse({ ...values, role }).success, false);
    assert.equal(loginSchema.safeParse({ ...values, userId: 'forged' }).success, false);
    assert.equal(registerSchema.safeParse({ ...values, name: 'Student account' }).success, true);
    for (const role of ['student', 'organizer']) assert.equal(registerSchema.safeParse({ ...values, name: 'Account', role }).success, false);
});
function actor(role) { return { _id: new mongoose.Types.ObjectId(), name: 'Temporary role test', email: 'test@example.edu', role, password: crypto.randomUUID() }; }
function response() { return { statusCode: 200, body: null, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } }; }
function request(role, existingId) {
    const calls = { regenerate: 0, save: 0 };
    const session = { ...(existingId ? { userId: existingId } : {}), regenerate(callback) { calls.regenerate++; callback(null); }, save(callback) { calls.save++; callback(null); } };
    return { req: { body: { email: 'test@example.edu', password: crypto.randomUUID(), ...(role === undefined ? {} : { role }) }, session }, calls };
}
test('verified credentials with a role mismatch never regenerate or authenticate a guest session', async t => {
    for (const actual of ['student', 'organizer']) {
        const user = actor(actual), selected = actual === 'student' ? 'organizer' : 'student';
        t.mock.method(User, 'findOne', async () => user); t.mock.method(bcrypt, 'compare', async () => true);
        const { req, calls } = request(selected), res = response(); await loginUser(req, res);
        assert.equal(res.statusCode, 403); assert.equal(res.body.code, 'ROLE_MISMATCH');
        assert.equal(req.session.userId, undefined); assert.deepEqual(calls, { regenerate: 0, save: 0 });
        assert.equal(user.role, actual); assert.equal(res.body.user, undefined);
        t.mock.restoreAll();
    }
});
test('failed credentials remain generic and a role mismatch cannot replace a previous valid identity', async t => {
    const user = actor('organizer'); t.mock.method(User, 'findOne', async () => user);
    t.mock.method(bcrypt, 'compare', async () => false);
    let attempt = request('student'), res = response(); await loginUser(attempt.req, res);
    assert.equal(res.statusCode, 401); assert.equal(res.body.accountRole, undefined); assert.equal(attempt.calls.regenerate, 0);
    t.mock.restoreAll(); t.mock.method(User, 'findOne', async () => user); t.mock.method(bcrypt, 'compare', async () => true);
    attempt = request('student', 'previous-valid-account'); res = response(); await loginUser(attempt.req, res);
    assert.equal(res.statusCode, 403); assert.equal(attempt.req.session.userId, 'previous-valid-account'); assert.equal(attempt.calls.regenerate, 0);
});
test('successful role selections use the actual database identity and existing session rotation', async t => {
    for (const actual of ['student', 'organizer']) {
        const user = actor(actual); t.mock.method(User, 'findOne', async () => user); t.mock.method(bcrypt, 'compare', async () => true);
        const { req, calls } = request(actual), res = response(); await loginUser(req, res);
        assert.equal(res.statusCode, 200); assert.equal(req.session.userId, String(user._id));
        assert.equal(res.body.user.role, actual); assert.equal(res.body.user.password, undefined);
        assert.deepEqual(calls, { regenerate: 1, save: 1 }); assert.match(res.body.csrfToken, /^[a-f\d]{64}$/);
        t.mock.restoreAll();
    }
});
