export const ORGANIZER_VIEWS = ['upcoming', 'past', 'cancelled', 'review'];
export function organizerQuery(params) {
  const candidate = params.get('view');
  const value = params.get('page') || '1';
  return { view: ORGANIZER_VIEWS.includes(candidate) ? candidate : 'upcoming', page: /^[1-9]\d*$/.test(value) && Number(value) <= 1000000 ? Number(value) : 1 };
}
export function organizerStatus(event) {
  if (event.phase === 'cancelled') return 'Cancelled';
  if (event.phase === 'review') return 'Needs review';
  if (event.phase === 'past') return event.status === 'completed' ? 'Completed' : 'Past event';
  return 'Scheduled';
}
export function organizerCapacity(event) {
  const valid = Number.isInteger(event.capacity) && event.capacity > 0 && Number.isInteger(event.registeredCount) && event.registeredCount >= 0;
  if (!valid) return null;
  return { count: event.registeredCount, capacity: event.capacity, remaining: Math.max(0, event.capacity - event.registeredCount), percent: Math.min(100, event.registeredCount / event.capacity * 100), full: event.registeredCount >= event.capacity };
}
