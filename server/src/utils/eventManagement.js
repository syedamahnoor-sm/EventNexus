const crypto = require('node:crypto');
const UUID = /^[a-f\d]{8}-[a-f\d]{4}-4[a-f\d]{3}-[89ab][a-f\d]{3}-[a-f\d]{12}$/i;
function managementError(status, message, field) { return Object.assign(new Error(message), { status, field }); }
function expectedEventVersion(value) {
    if (value === undefined) return null; // Preserve existing API clients; the editor always supplies a version.
    if (!/^(0|[1-9]\d*)$/.test(value) || !Number.isSafeInteger(Number(value)) || Number(value) >= Number.MAX_SAFE_INTEGER) throw managementError(400, 'Refresh the event before making changes.');
    return Number(value);
}
function assertFutureDate(value, now = new Date()) {
    if (!Number.isFinite(new Date(value).getTime()) || new Date(value) <= now) throw managementError(400, 'Choose a date and time in the future.', 'date');
}
function assertEditable(event, version, now = new Date()) {
    if (event.status !== 'upcoming' || event.date <= now) throw managementError(409, 'Only future scheduled events can be changed. Past and cancelled records are preserved.');
    if (version !== null && version !== (event.__v || 0)) throw managementError(409, 'This event changed in another session. Refresh and review it before saving.');
}
function creationFingerprint(data) {
    const values = { ...data, date: new Date(data.date).toISOString() };
    return crypto.createHash('sha256').update(JSON.stringify(Object.fromEntries(Object.keys(values).sort().map(key => [key, values[key]])))).digest('hex');
}
function publicEvent(event) {
    const value = event.toObject ? event.toObject() : { ...event };
    delete value.creationKey; delete value.creationFingerprint;
    return value;
}
function handleManagementError(error, res, next) {
    if (!error.status) return next(error);
    return res.status(error.status).json({ message: error.message, ...(error.field ? { errors: { fieldErrors: { [error.field]: [error.message] } } } : {}) });
}
module.exports = { UUID, managementError, expectedEventVersion, assertFutureDate, assertEditable, creationFingerprint, publicEvent, handleManagementError };
