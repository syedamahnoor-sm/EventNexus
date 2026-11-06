export const CATEGORIES = ['Technology', 'Workshops', 'Competitions', 'Career', 'Community', 'Other'];
export const CATEGORY_COPY = ['Build what’s next.', 'Learn by doing.', 'Rise to the challenge.', 'Make your next move.', 'Find your people.', 'Follow your curiosity.'];
export const PERIODS = [{ value: '', label: 'Any date' }, { value: 'week', label: 'Next 7 days' }, { value: 'month', label: 'Next month' }];
export function eventDate(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Date to be announced' : new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', year: 'numeric' }).format(date);
}
