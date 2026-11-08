export function participantQuery(params) {
  const raw = params.get('page');
  return { search: (params.get('search') || '').slice(0, 120).trim(), status: ['all', 'cancelled_by_student', 'cancelled_by_organizer'].includes(params.get('status')) ? params.get('status') : 'active', sort: params.get('sort') === 'oldest' ? 'oldest' : 'newest', page: /^[1-9]\d*$/.test(raw || '') && Number(raw) <= 1000000 ? Number(raw) : 1 };
}
export function participantValue(value) { return typeof value === 'string' && value.trim() ? value : 'Not recorded'; }
export function registrationDate(value) {
  const date = value && new Date(value);
  return date && Number.isFinite(date.getTime()) ? new Intl.DateTimeFormat('en', { dateStyle: 'medium', timeStyle: 'short', timeZoneName: undefined }).format(date) : 'Not recorded';
}
export function participantError(status) { return status === 403 ? 'forbidden' : status === 404 ? 'missing' : status === 400 ? 'invalid' : status === 401 ? 'session' : 'network'; }
