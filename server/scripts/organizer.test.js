const test = require('node:test');
const assert = require('node:assert/strict');
const { dashboardQuery, dashboardPipeline, organizerState } = require('../src/utils/organizerDashboard');

test('organizer query bounds pagination, rejects injected ownership and unsupported filters', () => {
    assert.deepEqual(dashboardQuery.parse({}), { view: 'upcoming', page: 1, limit: 8 });
    assert.deepEqual(dashboardQuery.parse({ view: 'past', page: '2', limit: '24' }), { view: 'past', page: 2, limit: 24 });
    for (const query of [{ organizer: 'someone' }, { userId: 'someone' }, { page: '0' }, { page: '1.2' }, { page: '1000001' }, { page: ['1'] }, { limit: '25' }, { view: 'all' }, { view: { $ne: '' } }]) assert.equal(dashboardQuery.safeParse(query).success, false);
});
test('organizer lifecycle partitions the scheduled boundary and never treats cancellation as completion', () => {
    const now = new Date('2030-01-01T12:00:00Z');
    for (const [status, date, expected] of [['upcoming', '2030-01-01T12:00:01Z', 'upcoming'], ['upcoming', now, 'past'], ['completed', now, 'past'], ['completed', '2030-01-02', 'review'], ['cancelled', now, 'cancelled'], ['cancelled', '2030-01-02', 'cancelled'], ['upcoming', null, 'review'], ['upcoming', 'invalid', 'review']]) assert.equal(organizerState({ status, date }, now), expected);
});
test('aggregation starts with session ownership and exposes counts without participant or recap data', () => {
    const owner = 'session-owned-id', now = new Date();
    const pipeline = dashboardPipeline(owner, { view: 'upcoming', page: 2, limit: 8 }, now);
    assert.deepEqual(pipeline[0], { $match: { organizer: owner } });
    const lookup = pipeline.find(stage => stage.$lookup).$lookup;
    assert.equal(lookup.foreignField, 'event');
    assert.deepEqual(lookup.pipeline, [{ $count: 'total' }]);
    assert.equal(pipeline[1].$project.description, undefined);
    const facets = pipeline.at(-1).$facet;
    assert.deepEqual(facets.events[1], { $sort: { date: 1, _id: 1 } });
    assert.deepEqual(facets.events[2], { $skip: 8 });
    assert.deepEqual(facets.events[3], { $limit: 8 });
    assert.deepEqual(facets.next[2], { $limit: 1 });
    assert.equal(facets.overview[0].$group.activeRegistrations.$sum, '$registeredCount');
    assert.equal(dashboardPipeline(owner, { view: 'past', page: 1, limit: 8 }, now).at(-1).$facet.events[1].$sort.date, -1);
});
