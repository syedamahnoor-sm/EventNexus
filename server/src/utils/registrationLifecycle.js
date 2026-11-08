const ACTIVE = { status: { $in: ['active', null] } }; // null also matches missing legacy fields.
const ACTIVE_INDEX = 'unique_active_student_event';
const ACTIVE_KEYS = { student: 1, event: 1 };
const ACTIVE_PARTIAL = { status: { $in: ['active', null] } };
const isActive = record => Boolean(record && (record.status == null || record.status === 'active'));
function legacyUnique(index) { return index.unique === true && !index.partialFilterExpression && !index.sparse && JSON.stringify(index.key) === JSON.stringify(ACTIVE_KEYS); }
function replacementValid(index) { return index?.name === ACTIVE_INDEX && index.unique === true && JSON.stringify(index.key) === JSON.stringify(ACTIVE_KEYS) && JSON.stringify(index.partialFilterExpression) === JSON.stringify(ACTIVE_PARTIAL); }
async function assertLifecycleReady(collection, { allowLegacy = false } = {}) {
    const indexes = await collection.indexes();
    if (allowLegacy && indexes.some(legacyUnique)) return;
    if (!indexes.some(replacementValid) || indexes.some(legacyUnique)) throw Object.assign(new Error('Registration maintenance is required. Please try again after the lifecycle index migration.'), { status: 503, code: 'REGISTRATION_MIGRATION_REQUIRED' });
}
function studentRegistration(record) {
    if (!record) return null;
    const result = record.toObject ? record.toObject() : { ...record };
    result.status ||= 'active';
    if (result.cancellation) { const { at, reason } = result.cancellation; result.cancellation = { at, ...(reason ? { reason } : {}) }; }
    delete result.student;
    delete result.__v;
    return result;
}
module.exports = { ACTIVE, ACTIVE_INDEX, ACTIVE_KEYS, ACTIVE_PARTIAL, isActive, legacyUnique, replacementValid, assertLifecycleReady, studentRegistration };
