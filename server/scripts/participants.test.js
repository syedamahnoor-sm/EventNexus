const test = require('node:test');
const assert = require('node:assert/strict');
const { participantQuery, escapeRegex, rosterPipeline } = require('../src/utils/participants');

test('participant query bounds work and reject ownership injection, arrays and unsafe searches', () => {
    assert.deepEqual(participantQuery.parse({}), { search: '', sort: 'newest', status: 'active', page: 1, limit: 12 });
    assert.deepEqual(participantQuery.parse({ search: '  CAMPUS  ', sort: 'oldest', page: '2', limit: '50' }), { search: 'CAMPUS', sort: 'oldest', status: 'active', page: 2, limit: 50 });
    for (const query of [{ organizer: 'x' }, { event: 'x' }, { search: { $ne: '' } }, { search: ['name'] }, { search: 'x'.repeat(121) }, { search: 'x\u0000' }, { limit: '51' }, { page: '1000001' }, { page: '0' }, { sort: 'name' }]) assert.equal(participantQuery.safeParse(query).success, false);
});
test('search operators are literal text, not executable regular expressions', () => {
    for (const text of ['.*', '(a+)+$', '[campus]', 'a\\b', '${email}', 'a|b', 'a?']) {
        const expression = new RegExp(escapeRegex(text), 'i');
        assert.equal(expression.test('prefix ' + text + ' suffix'), true);
        assert.equal(expression.test('unrelated ordinary student'), false);
    }
});
test('one event-scoped stream provides matched and unfiltered totals, stable sort and bounded pages', () => {
    const pipeline = rosterPipeline('owned-event', { search: '.*', sort: 'oldest', page: 2, limit: 12 });
    assert.deepEqual(pipeline[0], { $match: { event: 'owned-event' } });
    assert.deepEqual(pipeline[1], { $sort: { createdAt: 1, _id: 1 } });
    const facet = pipeline[2].$facet;
    assert.deepEqual(facet.total, [{ $count: 'value' }]);
    assert.equal(facet.matching[1].$match.$or[0]['attendee.fullName'].$regex, '\\.\\*');
    assert.deepEqual(facet.rows[2], { $skip: 12 }); assert.deepEqual(facet.rows[3], { $limit: 12 });
    const projection = facet.rows[4].$project;
    assert.equal(projection['attendee.email'], 1);
    for (const key of ['student', 'answers', 'attendee.contactNumber', 'password', 'updatedAt']) assert.equal(projection[key], undefined);
    assert.equal(JSON.stringify(pipeline).includes('$lookup'), false);
    assert.equal(rosterPipeline('event', participantQuery.parse({}))[1].$sort._id, -1);
});
