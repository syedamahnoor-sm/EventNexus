export function groupStudentRegistrations(records, now = Date.now()) {
  const upcoming = [], past = [], unavailable = [];
  for (const registration of records) {
    const event = registration.event;
    const date = event && typeof event === 'object' && event.date ? new Date(event.date).getTime() : NaN;
    if (!event?._id || !Number.isFinite(date)) unavailable.push(registration);
    else if (event.status === 'upcoming' && date > now) upcoming.push(registration);
    else if (['upcoming', 'completed'].includes(event.status) && date <= now) past.push(registration);
    else unavailable.push(registration);
  }
  const tie = (a, b) => String(a._id).localeCompare(String(b._id));
  upcoming.sort((a, b) => new Date(a.event.date) - new Date(b.event.date) || tie(a, b));
  past.sort((a, b) => new Date(b.event.date) - new Date(a.event.date) || tie(a, b));
  return { upcoming, past, unavailable, next: upcoming[0] || null };
}

export function registrationEventState(event) {
  if (!event || typeof event !== 'object' || !event._id) return 'Event no longer available';
  if (event.status === 'cancelled') return 'Event cancelled';
  return 'Event information unavailable';
}

export function dashboardEventTime(value) {
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? new Intl.DateTimeFormat('en', { hour: 'numeric', minute: '2-digit', timeZoneName: 'short' }).format(date) : 'Time unavailable';
}
