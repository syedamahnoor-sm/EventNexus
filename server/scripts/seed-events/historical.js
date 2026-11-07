const mongoose = require('mongoose');
const crypto = require('node:crypto');
const bcrypt = require('bcryptjs');
const assert = require('node:assert/strict');
const User = require('../../src/models/User');
const Event = require('../../src/models/Event');
const Registration = require('../../src/models/Registration');
const Manifest = require('./manifest');
const photos = require('./photos.json');
const { validatePhotoAssets } = require('./photo-assets');
const { SeedSafetyError } = require('./safety');
const ARCHIVE_BATCH = 'eventnexus-campus-rewind-v1';
const EMAIL = 'archive-organizer@eventnexus-seed.invalid';
const NAME = 'EventNexus Archive Development Organizer';
const digest = value => crypto.createHash('sha256').update(value).digest('hex');

// Fictional historical fixtures, not verified campus history. No recap/outcome/attendance claims.
const HISTORY = [
  ['ai-roundtable', 'Technology', 'Student AI Roundtable', 'Computing Block, Seminar Hall C-201', 5, 'ai-meetup', 'A student discussion of introductory machine learning concepts, responsible use, and possible campus projects. The session format combines short presentations with open questions.', 'completed'],
  ['sketch-studio', 'Workshops', 'Interface Sketching Studio', 'Design School, Critique Studio 2', 12, 'design-sprint', 'An introduction to paper prototypes, interface hierarchy, and explaining a design decision. Students explore ways to make everyday campus information easier to use.', 'completed'],
  ['prototype-challenge', 'Competitions', 'Campus Prototype Challenge', 'Innovation Centre, Collaboration Floor', 19, 'innovation-showcase', 'A practical challenge centered on building a small prototype for a campus need. The original brief covers constraints, team collaboration, and presenting an approach.', 'completed'],
  ['alumni-conversations', 'Career', 'Alumni Career Conversations', 'Alumni Centre, Garden Hall', 28, 'career-network', 'An informal career conversation format with small-group questions about early roles, building useful skills, and choosing a direction after university.', 'completed'],
  ['garden-gathering', 'Community', 'Campus Garden Gathering', 'Botanical Garden, Teaching Beds', 40, 'campus-garden', 'A hands-on introduction to planting, seasonal care, and the shared teaching garden. The event information includes practical preparation for outdoor gardening activities.', 'completed'],
  ['acoustic-session', 'Other', 'Courtyard Acoustic Session', 'Arts Courtyard, Small Stage', 55, 'creative-open-mic', 'An informal acoustic performance session with student musicians and an open audience. The event format offers space for first-time performers alongside experienced players.', 'completed'],
  ['open-source-jam', 'Technology', 'Open Source Study Jam', 'Computing Commons, Project Room 3', 70, 'open-source', 'A collaborative study session about reading contribution guides, finding approachable issues, and giving constructive feedback on documentation and code.', 'upcoming'],
  ['research-circle', 'Workshops', 'Research Writing Circle', 'Graduate Centre, Seminar Room G-4', 95, 'research-writing', 'A guided writing session focused on research questions, abstracts, and clear source attribution. The original plan includes individual drafting and structured peer feedback.', 'completed'],
  ['algorithm-sprint', 'Competitions', 'Algorithm Practice Sprint', 'Computing Block, Contest Lab C-305', 120, 'coding-challenge', 'A short programming challenge designed around algorithmic reasoning and explaining solutions. The event format combines timed practice with a discussion of approaches.', 'completed'],
  ['portfolio-afternoon', 'Career', 'Portfolio Review Afternoon', 'Career Services, Consultation Suite', 150, 'resume-clinic', 'A review-focused afternoon for student resumes and portfolios. The original event information emphasizes presenting projects clearly and relating experience to a career goal.', 'completed'],
  ['volunteer-orientation', 'Community', 'Volunteer Orientation Circle', 'Student Centre, Community Desk', 190, 'volunteer-drive', 'An orientation to student volunteering, including project commitments, preparation, and finding a suitable team. This record describes the session rather than claiming project outcomes.', 'upcoming'],
  ['board-games-social', 'Other', 'Library Board Games Social', 'Central Library, Group Study Hall', 240, 'board-games', 'A casual social format with cooperative and strategy board games. Hosts introduce the rules and help students find a table without needing to arrive as a group.', 'completed'],
  ['cancelled-observing', 'Other', 'Outdoor Observing Session — Cancelled', 'Science Building, Rooftop Observatory', 8, 'astronomy-night', 'A fictional development example of a cancelled observing session. It must stay out of Campus Rewind and must never be represented as a completed experience.', 'cancelled'],
];

function buildHistorical(now = new Date()) {
  return HISTORY.map(([key, category, title, location, days, photo, description, status]) => ({
    key,
    event: {
      title, category, location, date: new Date(now.getTime() - days * 86400000),
      status, capacity: 60, registeredCount: 0,
      imageUrl: photos[photo].imageUrl, imageAlt: photos[photo].alt,
      description: `${description}\n\nFictional historical development record; not verified campus history. Photography is illustrative, not documentation of this event.\n[Development sample: ${ARCHIVE_BATCH}] ${key}`,
    },
  }));
}

async function inspectHistorical(manifest, session, cleanup = false) {
  const keys = new Set(HISTORY.map(row => row[0]));
  if (manifest.version !== 1 || manifest.users.length !== 1 || manifest.events.length !== HISTORY.length || manifest.registrations.length || new Set(manifest.events.map(item => String(item.id))).size !== HISTORY.length || new Set(manifest.events.map(item => item.key)).size !== HISTORY.length || manifest.events.some(item => !keys.has(item.key))) throw new SeedSafetyError('Archive manifest is incomplete; refusing to guess ownership.');
  const owner = manifest.users[0];
  const user = await User.findById(owner.id).session(session).lean();
  const events = await Event.find({ _id: { $in: manifest.events.map(item => item.id) } }).session(session).lean();
  if (!cleanup && (!user || events.length !== HISTORY.length)) throw new SeedSafetyError('Archive seed is incomplete; inspect it or use its scoped cleanup.');
  if (user && (user.email !== EMAIL || user.name !== NAME || user.role !== 'organizer' || digest(user.password) !== owner.fingerprint)) throw new SeedSafetyError('Archive organizer identity has changed; no records modified.');
  for (const event of events) {
    const entry = manifest.events.find(item => String(item.id) === String(event._id));
    if (String(event.organizer) !== String(owner.id) || !event.description.endsWith(`[Development sample: ${ARCHIVE_BATCH}] ${entry.key}`)) throw new SeedSafetyError('Archive event ownership marker has changed.');
  }
  if (await Registration.exists({ $or: [{ event: { $in: manifest.events.map(item => item.id) } }, { student: owner.id }] }).session(session)) throw new SeedSafetyError('Archive cohort has outside registrations; no records changed.');
  if (cleanup && await Event.exists({ organizer: owner.id, _id: { $nin: manifest.events.map(item => item.id) } }).session(session)) throw new SeedSafetyError('Archive organizer owns untracked events; cleanup refused.');
  if (!cleanup && events.some(event => event.registeredCount !== 0)) throw new SeedSafetyError('Historical seed registration counters are inconsistent; no repairs attempted.');
  return { user, events };
}

async function seedHistorical() {
  await validatePhotoAssets();
  let result;
  await mongoose.connection.transaction(async session => {
    const existing = await Manifest.findById(ARCHIVE_BATCH).session(session).lean();
    if (existing) { const snapshot = await inspectHistorical(existing, session); result = { created: false, events: snapshot.events.length }; return; }
    if (await User.exists({ email: EMAIL }).session(session)) throw new SeedSafetyError('Archive sample email exists without its manifest; existing user will not be modified.');
    const password = await bcrypt.hash(process.env.EVENTNEXUS_SEED_PASSWORD || crypto.randomBytes(36).toString('base64url'), 12);
    const [organizer] = await User.create([{ name: NAME, email: EMAIL, role: 'organizer', password }], { session });
    const catalog = buildHistorical();
    const events = await Event.insertMany(catalog.map(item => ({ ...item.event, organizer: organizer._id })), { session });
    const [manifest] = await Manifest.create([{
      _id: ARCHIVE_BATCH, version: 1, demoLoginEnabled: Boolean(process.env.EVENTNEXUS_SEED_PASSWORD),
      users: [{ id: organizer._id, name: NAME, email: EMAIL, role: 'organizer', fingerprint: digest(password) }],
      events: events.map((event, index) => ({ id: event._id, key: catalog[index].key })), registrations: [],
    }], { session });
    await inspectHistorical(manifest.toObject(), session);
    result = { created: true, events: events.length };
  });
  return result;
}

async function cleanupHistorical() {
  let result;
  await mongoose.connection.transaction(async session => {
    result = { events: 0, users: 0 };
    const manifest = await Manifest.findById(ARCHIVE_BATCH).session(session).lean();
    if (!manifest) return;
    await inspectHistorical(manifest, session, true);
    result.events = (await Event.deleteMany({ _id: { $in: manifest.events.map(item => item.id) } }, { session })).deletedCount;
    result.users = (await User.deleteMany({ _id: manifest.users[0].id }, { session })).deletedCount;
    await Manifest.deleteOne({ _id: ARCHIVE_BATCH }, { session });
  });
  return result;
}

async function verifyHistorical() {
  let snapshot;
  await mongoose.connection.transaction(async session => {
    const manifest = await Manifest.findById(ARCHIVE_BATCH).session(session).lean();
    if (!manifest) throw new SeedSafetyError('Run seed:archive first.');
    snapshot = await inspectHistorical(manifest, session);
  });
  const get = async params => {
    const response = await fetch('http://localhost:5000/api/events?' + new URLSearchParams(params), { signal: AbortSignal.timeout(10000) });
    assert.equal(response.status, 200); return response.json();
  };
  const params = { scope: 'past', search: ARCHIVE_BATCH, limit: '50', sort: 'latest' };
  const response = await get(params);
  assert.equal(response.data.length, 12);
  assert.equal(response.pagination.total, 12);
  assert.ok(response.data.every(event => event.status !== 'cancelled' && new Date(event.date) <= new Date()));
  assert.deepEqual(response.data.map(event => event._id), snapshot.events.filter(event => event.status !== 'cancelled').sort((a, b) => b.date - a.date).map(event => String(event._id)));
  for (const category of ['Technology', 'Workshops', 'Competitions', 'Career', 'Community', 'Other']) {
    const categoryResponse = await get({ ...params, category }); assert.equal(categoryResponse.data.length, 2); assert.ok(categoryResponse.data.every(event => event.category === category));
  }
  const second = await get({ ...params, page: '2', limit: '6' }); assert.equal(second.data.length, 6); assert.equal(second.pagination.page, 2); assert.equal(second.pagination.totalPages, 2); assert.equal(second.pagination.hasNextPage, false);
  const upcoming = await get({ search: ARCHIVE_BATCH, limit: '50' }); assert.equal(upcoming.data.length, 0);
  console.log('PASS archive: 12 eligible records, all six categories, newest-first, pagination, cancelled exclusion, upcoming separation; zero fabricated recaps/attendance');
}

module.exports = { ARCHIVE_BATCH, HISTORY, buildHistorical, seedHistorical, cleanupHistorical, verifyHistorical };
