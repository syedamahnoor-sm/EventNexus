const { BATCH_ID, DISTRIBUTION } = require('./catalog');
const { SeedSafetyError } = require('./safety');

const check = (condition, label) => {
  if (!condition) throw new SeedSafetyError(`API verification failed: ${label}.`);
};
const sameIds = (rows, expected) => rows.length === expected.length && rows.every((row, index) => String(row._id) === String(expected[index]._id));

async function verifyApi(events) {
  let base;
  try { base = new URL(process.env.EVENTNEXUS_SEED_API_URL || 'http://localhost:5000/api'); }
  catch { throw new SeedSafetyError('Invalid local API verification URL.'); }
  check(['http:', 'https:'].includes(base.protocol) && ['localhost', '127.0.0.1', '[::1]'].includes(base.hostname) && !base.username && !base.password && !base.search && !base.hash, 'verification URL must be a credential-free local API');
  const root = base.href.replace(/\/$/, '');
  const request = async (path, params = {}, status = 200) => {
    const query = new URLSearchParams(params);
    let response;
    try { response = await fetch(`${root}${path}?${query}`, { signal: AbortSignal.timeout(10000) }); }
    catch { throw new SeedSafetyError('Local API is unreachable; start the existing backend and retry verification.'); }
    check(response.status === status, `HTTP ${status} expected`);
    try { return await response.json(); } catch { throw new SeedSafetyError('API did not return JSON.'); }
  };
  const baseline = await request('/events');
  check(Array.isArray(baseline.data) && baseline.data.length > 0 && baseline.pagination.total >= 30, 'public event listing');
  console.log('PASS public GET /api/events');
  const params = { search: BATCH_ID, limit: '50' };
  const cohort = await request('/events', params);
  check(cohort.pagination.total === 30 && cohort.data.length === 30, '30 upcoming development events (older cohorts may need cleanup and reseeding)');
  const expected = [...events].sort((a, b) => a.date - b.date || String(a._id).localeCompare(String(b._id)));
  check(sameIds(cohort.data, expected), 'seed cohort matches the configured database and soonest sorting');
  check(cohort.data.every(event => event.imageUrl && event.imageAlt && event.imageUrl === events.find(item => String(item._id) === String(event._id)).imageUrl), 'event photography in list responses');
  console.log('PASS photography fields on all 30 events');
  for (const [category, count] of Object.entries(DISTRIBUTION)) {
    const response = await request('/events', { ...params, category });
    check(response.pagination.total === count && response.data.length === count && response.data.every(event => event.category === category), `${category} filtering`);
    console.log(`PASS category ${category}: ${count}`);
  }
  const search = await request('/events', { search: 'AI and Machine Learning Meetup', limit: '50' });
  check(search.data.some(event => String(event._id) === String(events.find(event => event.title === 'AI and Machine Learning Meetup')._id)), 'title search');
  console.log('PASS title search');
  for (const period of ['week', 'month']) {
    const now = new Date();
    const end = new Date(now);
    if (period === 'week') end.setDate(end.getDate() + 7);
    else end.setMonth(end.getMonth() + 1);
    const matching = expected.filter(event => event.date >= now && event.date < end);
    const response = await request('/events', { ...params, period });
    check(matching.length > 0 && matching.length < 30 && response.pagination.total === matching.length && sameIds(response.data, matching), `${period} date filter`);
    console.log(`PASS ${period} filter: ${matching.length}`);
  }
  const latest = await request('/events', { ...params, sort: 'latest' });
  const descending = [...events].sort((a, b) => b.date - a.date || String(a._id).localeCompare(String(b._id)));
  check(sameIds(latest.data, descending), 'latest sorting');
  console.log('PASS soonest/latest sorting');
  const pages = [];
  for (let page = 1; page <= 5; page++) {
    const response = await request('/events', { search: BATCH_ID, limit: '7', page: String(page) });
    const meta = response.pagination;
    check(meta.page === page && meta.limit === 7 && meta.total === 30 && meta.totalPages === 5 && meta.hasNextPage === (page < 5), 'pagination metadata');
    check(response.data.length === (page < 5 ? 7 : 2), 'page size');
    pages.push(...response.data);
  }
  check(sameIds(pages, expected), 'pagination has no duplicates or missing records');
  console.log('PASS pagination: five pages, 7/7/7/7/2');
  const detail = await request(`/events/${expected[0]._id}`);
  check(String(detail.data._id) === String(expected[0]._id) && detail.data.organizer?.name === 'EventNexus Development Organizer', 'details and valid populated organizer');
  check(detail.data.imageUrl === expected[0].imageUrl && detail.data.imageAlt === expected[0].imageAlt, 'details reuse the list photograph');
  await request('/events/not-an-id', {}, 400);
  console.log('PASS event detail and invalid ID');
}

module.exports = { verifyApi };
