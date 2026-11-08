import { CATEGORIES } from './events.js';
import { normalizeQuestions, validateQuestionDefinitions } from './registrationQuestions.js';

export const EVENT_FIELDS = ['title', 'description', 'category', 'date', 'location', 'capacity', 'imageUrl', 'imageAlt', 'registrationQuestions'];
export const emptyEventValues = () => ({ title: '', description: '', category: 'Other', date: '', location: '', capacity: '', imageUrl: '', imageAlt: '', registrationQuestions: [] });
export function localEventDate(value) {
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 23) : '';
}
export function parseLocalEventDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?$/.test(value)) return null;
  const date = new Date(value);
  const [year, month, day, hour, minute] = value.split(/[-T:]/).map(Number);
  // Reject rolled dates and nonexistent local times during DST transitions.
  return Number.isFinite(date.getTime()) && date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day && date.getHours() === hour && date.getMinutes() === minute ? date : null;
}
export function eventFormValues(event) {
  return event ? { title: event.title || '', description: event.description || '', category: event.category || 'Other', date: localEventDate(event.date), location: event.location || '', capacity: String(event.capacity ?? ''), imageUrl: event.imageUrl || '', imageAlt: event.imageAlt || '', registrationQuestions: normalizeQuestions(event.registrationQuestions || []) } : emptyEventValues();
}
export function validEventImage(value) {
  if (!value) return true;
  if (value.length > 2048 || /[\s\\]/.test(value) || [...value].some(character => character.charCodeAt(0) < 32)) return false;
  if (/^\/images\/events\/[a-z0-9][a-z0-9-]*\.webp$/.test(value)) return true;
  try { const url = new URL(value); return url.protocol === 'https:' && Boolean(url.hostname) && !url.username && !url.password; } catch { return false; }
}
export function validateEventForm(values, now = Date.now()) {
  const errors = {};
  for (const [name, min, max, label] of [['title', 3, 120, 'title'], ['description', 10, 2000, 'description'], ['location', 3, 200, 'venue']]) {
    if (values[name].trim().length < min || values[name].trim().length > max) errors[name] = `Use ${min}–${max} characters for the ${label}.`;
  }
  if (!CATEGORIES.includes(values.category)) errors.category = 'Choose one of the six supported categories.';
  const date = parseLocalEventDate(values.date);
  if (!date || date.getTime() <= now) errors.date = 'Choose a valid date and time in the future.';
  if (!/^[1-9]\d*$/.test(values.capacity) || !Number.isSafeInteger(Number(values.capacity))) errors.capacity = 'Enter a whole number of places, at least 1.';
  if (!validEventImage(values.imageUrl.trim())) errors.imageUrl = 'Use a valid HTTPS image URL. Uploads are not available here.';
  if (values.imageAlt.trim().length > 200 || (values.imageUrl.trim() && !values.imageAlt.trim())) errors.imageAlt = 'Describe the image in 1–200 characters.';
  return { ...errors, ...validateQuestionDefinitions(values.registrationQuestions || []) };
}
export function eventFormPayload(values) {
  return Object.fromEntries(EVENT_FIELDS.map(field => [field, field === 'registrationQuestions' ? normalizeQuestions(values[field] || []) : field === 'capacity' ? Number(values[field]) : field === 'date' ? parseLocalEventDate(values[field])?.toISOString() : values[field].trim()]));
}
export function eventMatches(event, payload) {
  return EVENT_FIELDS.every(field => field === 'registrationQuestions' ? JSON.stringify(normalizeQuestions(event[field] || [])) === JSON.stringify(payload[field] || []) : field === 'date' ? new Date(event.date).getTime() === new Date(payload.date).getTime() : field === 'capacity' ? event.capacity === payload.capacity : (event[field] || '') === (payload[field] || ''));
}
export function canManageEvent(event, now = Date.now()) { return Boolean(event?._id && event.status === 'upcoming' && new Date(event.date).getTime() > now); }

const prefix = 'eventnexus-event-draft:';
const drafts = new Map();
const draftKey = (userId, id) => `${prefix}${userId}:${id || 'new'}`;
export function readEventDraft(userId, id) {
  const key = draftKey(userId, id);
  try {
    const value = JSON.parse(globalThis.sessionStorage?.getItem(key) || 'null') || drafts.get(key);
    if (value && EVENT_FIELDS.filter(field => field !== 'registrationQuestions').every(field => typeof value.values?.[field] === 'string') && /^[a-f\d-]{36}$/i.test(value.creationKey || '') && Number.isSafeInteger(value.version) && value.version >= 0) {
      value.values.registrationQuestions ||= []; if (value.base) value.base.registrationQuestions ||= [];
      if (Array.isArray(value.values.registrationQuestions)) return value;
    }
  } catch { return drafts.get(key) || null; }
  return null;
}
export function storeEventDraft(userId, id, value) { const key = draftKey(userId, id); drafts.set(key, value); try { globalThis.sessionStorage?.setItem(key, JSON.stringify(value)); } catch { /* In-memory draft remains available. */ } }
export function clearEventDraft(userId, id) { const key = draftKey(userId, id); drafts.delete(key); try { globalThis.sessionStorage?.removeItem(key); } catch { /* Storage may be unavailable. */ } }
export function clearOtherEventDrafts(userId) {
  const keep = `${prefix}${userId}:`;
  for (const key of drafts.keys()) if (!userId || !key.startsWith(keep)) drafts.delete(key);
  try { for (const key of Object.keys(globalThis.sessionStorage || {})) if (key.startsWith(prefix) && (!userId || !key.startsWith(keep))) globalThis.sessionStorage.removeItem(key); } catch { /* Storage may be unavailable. */ }
}
