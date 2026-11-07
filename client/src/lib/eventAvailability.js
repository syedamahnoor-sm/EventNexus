export function isPastEvent(event, now) {
  const date = new Date(event.date).getTime();
  return ['upcoming', 'completed'].includes(event.status) && Number.isFinite(date) && date <= now;
}

export function hasEventRecap(event) {
  return Boolean(event?.recap?.trim() || event?.highlights?.length || event?.gallery?.length);
}

export function eventSeats(event) {
  const capacity = Number.isInteger(event.capacity) && event.capacity > 0 ? event.capacity : null;
  const countKnown = Number.isInteger(event.registeredCount) && event.registeredCount >= 0;
  const remaining = capacity === null || !countKnown ? null : Math.max(0, capacity - event.registeredCount);
  return { capacity, remaining };
}

/** The server remains authoritative; these states explain eligibility before submission. */
export function eventAvailability(event, now) {
  const { capacity, remaining } = eventSeats(event);
  const date = new Date(event.date).getTime();
  let state = 'open';
  if (event.status === 'cancelled') state = 'cancelled';
  else if (!Number.isFinite(date)) state = 'unconfirmed';
  else if (isPastEvent(event, now)) state = event.status === 'completed' ? 'completed' : 'past';
  else if (remaining === null || event.status !== 'upcoming') state = 'unconfirmed';
  else if (remaining === 0) state = 'full';
  const messages = {
    open: ['Registration open', 'A place for your curiosity. Join this campus experience.'],
    cancelled: ['Event cancelled', 'The organizer has cancelled this event. Registration is closed.'],
    completed: ['Past event', 'The scheduled date has passed. New registrations are closed.'],
    past: ['Past event', 'The scheduled start time has passed. New registrations are closed.'],
    full: ['Fully booked', 'All places are currently taken. There is no waitlist available.'],
    unconfirmed: ['Registration unavailable', 'Event availability cannot be confirmed right now.'],
  };
  return { state, capacity, remaining, canRegister: state === 'open', title: messages[state][0], description: messages[state][1] };
}
