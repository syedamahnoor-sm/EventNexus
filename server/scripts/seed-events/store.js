const { ACTIVE } = require('../../src/utils/registrationLifecycle');
const CancellationOutbox = require('../../src/models/CancellationOutbox');
const crypto = require('node:crypto');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../../src/models/User');
const Event = require('../../src/models/Event');
const Registration = require('../../src/models/Registration');
const Manifest = require('./manifest');
const { BATCH_ID, MARKER, CATALOG, buildCatalog } = require('./catalog');
const { SeedSafetyError } = require('./safety');
const photos = require('./photos.json');
const { validatePhotoAssets } = require('./photo-assets');
const fingerprint = password => crypto.createHash('sha256').update(password).digest('hex');
const same = (a, b) => String(a) === String(b);
const coreFingerprint = snapshot => {
  const sorted = records => records.map(record => ({ ...record })).sort((a, b) => String(a._id).localeCompare(String(b._id)));
  const events = snapshot.events.map(({ imageUrl, imageAlt, ...event }) => event);
  return fingerprint(JSON.stringify({ users: sorted(snapshot.users), events: sorted(events), registrations: sorted(snapshot.registrations) }));
};

async function inspect(manifest, session, { cleanup = false } = {}) {
  const userIds = manifest.users.map(item => item.id);
  const eventIds = manifest.events.map(item => item.id);
  const registrationIds = manifest.registrations.map(item => item.id);
  if (manifest.version !== 1 || manifest.events.length !== CATALOG.length || manifest.users.length < 2 ||
      new Set(userIds.map(String)).size !== userIds.length || new Set(eventIds.map(String)).size !== eventIds.length ||
      new Set(manifest.events.map(item => item.key)).size !== CATALOG.length ||
      manifest.events.some(item => !CATALOG.some(row => row[0] === item.key))) {
    throw new SeedSafetyError('Refusing: seed manifest is incomplete or does not match this seed version.');
  }
  const users = await User.find({ _id: { $in: userIds } }).session(session).lean();
  const events = await Event.find({ _id: { $in: eventIds } }).session(session).lean();
  const registrations = await Registration.find({ _id: { $in: registrationIds } }).session(session).lean();
  if (!cleanup && (users.length !== userIds.length || events.length !== eventIds.length)) {
    throw new SeedSafetyError('Refusing: the seed cohort is incomplete. Inspect it or use the guarded cleanup before reseeding.');
  }
  for (const user of users) {
    const owner = manifest.users.find(item => same(item.id, user._id));
    if (user.email !== owner.email || user.name !== owner.name || user.role !== owner.role ||
        !user.email.endsWith('@eventnexus-seed.invalid') || fingerprint(user.password) !== owner.fingerprint) {
      throw new SeedSafetyError('Refusing: a tracked development user has changed identity or credentials. No records changed.');
    }
  }
  const organizer = manifest.users.find(item => item.role === 'organizer');
  if (!organizer) throw new SeedSafetyError('Refusing: manifest has no organizer.');
  for (const event of events) {
    const owner = manifest.events.find(item => same(item.id, event._id));
    if (!same(event.organizer, organizer.id) || !event.description.endsWith(`${MARKER} ${owner.key}`)) {
      throw new SeedSafetyError('Refusing: tracked event ownership or development marker has changed.');
    }
  }
  for (const registration of registrations) {
    const owner = manifest.registrations.find(item => same(item.id, registration._id));
    if (!same(owner.student, registration.student) || !same(owner.event, registration.event)) {
      throw new SeedSafetyError('Refusing: a tracked registration has changed ownership.');
    }
  }
  if (cleanup) {
    const externalEvent = await Event.exists({ organizer: { $in: userIds }, _id: { $nin: eventIds } }).session(session);
    const externalRegistration = await Registration.exists({
      _id: { $nin: registrationIds },
      $or: [{ event: { $in: eventIds } }, { student: { $in: userIds } }],
    }).session(session);
    const auditHistory = await CancellationOutbox.exists({ $or: [{ event: { $in: eventIds } }, { student: { $in: userIds } }] }).session(session);
    if (auditHistory) throw new SeedSafetyError('Cleanup refused: cancellation audit history references this cohort. No records deleted.');
    if (externalEvent || externalRegistration) {
      throw new SeedSafetyError('Cleanup refused: records not created by this seed reference the cohort. Resolve those dependencies explicitly; no records deleted.');
    }
  } else {
    const counts = await Registration.aggregate([
      { $match: { event: { $in: eventIds }, ...ACTIVE } }, { $group: { _id: '$event', total: { $sum: 1 } } },
    ]).session(session);
    for (const event of events) {
      const actual = counts.find(item => same(item._id, event._id))?.total || 0;
      if (actual !== event.registeredCount || actual > event.capacity) throw new SeedSafetyError('Refusing: registration counts are inconsistent. No automatic counter repair was attempted.');
    }
    const studentIds = await Registration.distinct('student', { event: { $in: eventIds } }).session(session);
    if (await User.countDocuments({ _id: { $in: studentIds }, role: 'student' }).session(session) !== studentIds.length) {
      throw new SeedSafetyError('Refusing: an event registration does not reference a valid student.');
    }
  }
  return { users, events, registrations };
}

async function seed() {
  await validatePhotoAssets();
  let result;
  await mongoose.connection.transaction(async session => {
    const existing = await Manifest.findById(BATCH_ID).session(session).lean();
    if (existing) {
      const snapshot = await inspect(existing, session);
      const photography = await applyPhotos(existing, snapshot.events, session);
      const after = await inspect(existing, session);
      if (coreFingerprint(snapshot) !== coreFingerprint(after)) throw new SeedSafetyError('Photo update changed non-image data; transaction rolled back.');
      result = { created: false, events: snapshot.events.length, users: snapshot.users.length, registrations: snapshot.registrations.length, ...photography };
      return;
    }
    const catalog = buildCatalog();
    const randomHash = await bcrypt.hash(crypto.randomBytes(36).toString('base64url'), 12);
    const demoHash = process.env.EVENTNEXUS_SEED_PASSWORD ? await bcrypt.hash(process.env.EVENTNEXUS_SEED_PASSWORD, 12) : randomHash;
    const poolSize = Math.max(...catalog.map(item => item.attendees));
    const people = [
      { name: 'EventNexus Development Organizer', email: 'organizer@eventnexus-seed.invalid', role: 'organizer', password: demoHash },
      ...Array.from({ length: poolSize }, (_, index) => ({
        name: `Campus Sample Student ${String(index + 1).padStart(3, '0')}`,
        email: `student-${String(index + 1).padStart(3, '0')}@eventnexus-seed.invalid`,
        role: 'student', password: index === 0 ? demoHash : randomHash,
      })),
    ];
    if (await User.exists({ email: { $in: people.map(item => item.email) } }).session(session)) {
      throw new SeedSafetyError('Refusing: reserved sample email already exists without this manifest. Existing users will not be reused or modified.');
    }
    const users = await User.insertMany(people, { session });
    const events = await Event.insertMany(catalog.map(item => ({ ...item.event, organizer: users[0]._id })), { session });
    const registrations = await Registration.insertMany(catalog.flatMap((item, eventIndex) =>
      users.slice(1, item.attendees + 1).map(student => ({ student: student._id, event: events[eventIndex]._id, status: 'active' }))), { session });
    const [manifest] = await Manifest.create([{
      _id: BATCH_ID, version: 1, demoLoginEnabled: Boolean(process.env.EVENTNEXUS_SEED_PASSWORD),
      users: users.map(user => ({ id: user._id, email: user.email, role: user.role, name: user.name, fingerprint: fingerprint(user.password) })),
      events: events.map((event, index) => ({ id: event._id, key: catalog[index].key })),
      registrations: registrations.map(registration => ({ id: registration._id, event: registration.event, student: registration.student })),
    }], { session });
    await inspect(manifest.toObject(), session);
    result = { created: true, events: events.length, users: users.length, registrations: registrations.length };
  });
  return result;
}

async function applyPhotos(manifest, events, session) {
  let imagesUpdated = 0;
  let customImagesPreserved = 0;
  for (const entry of manifest.events) {
    const event = events.find(item => same(item._id, entry.id));
    const photo = photos[entry.key];
    if (event.imageUrl && event.imageUrl !== photo.imageUrl) { customImagesPreserved++; continue; }
    if (event.imageUrl === photo.imageUrl && event.imageAlt) continue;
    // Only image fields change. Timestamps, dates, IDs, users, and registrations stay untouched.
    await Event.updateOne({ _id: event._id, organizer: event.organizer }, {
      $set: { imageUrl: photo.imageUrl, imageAlt: event.imageUrl ? event.imageAlt || photo.alt : photo.alt },
    }, { session, runValidators: true, timestamps: false });
    imagesUpdated++;
  }
  return { imagesUpdated, customImagesPreserved };
}

async function attachPhotos() {
  await validatePhotoAssets();
  let result;
  await mongoose.connection.transaction(async session => {
    const manifest = await Manifest.findById(BATCH_ID).session(session).lean();
    if (!manifest) throw new SeedSafetyError('No seed cohort exists. Photo attachment never creates or replaces a cohort.');
    const snapshot = await inspect(manifest, session);
    result = await applyPhotos(manifest, snapshot.events, session);
    const after = await inspect(manifest, session);
    if (coreFingerprint(snapshot) !== coreFingerprint(after)) throw new SeedSafetyError('Photo update changed non-image data; transaction rolled back.');
    result.coreDataUnchanged = true;
    result.registrationsPreserved = after.registrations.length;
  });
  return result;
}

async function cleanup() {
  let result = { events: 0, users: 0, registrations: 0 };
  await mongoose.connection.transaction(async session => {
    result = { events: 0, users: 0, registrations: 0 };
    const manifest = await Manifest.findById(BATCH_ID).session(session).lean();
    if (!manifest) return;
    await inspect(manifest, session, { cleanup: true });
    result.registrations = (await Registration.deleteMany({ _id: { $in: manifest.registrations.map(item => item.id) } }, { session })).deletedCount;
    result.events = (await Event.deleteMany({ _id: { $in: manifest.events.map(item => item.id) } }, { session })).deletedCount;
    result.users = (await User.deleteMany({ _id: { $in: manifest.users.map(item => item.id) } }, { session })).deletedCount;
    await Manifest.deleteOne({ _id: BATCH_ID }, { session });
  });
  return result;
}

module.exports = { seed, cleanup, attachPhotos, inspect, Manifest };
