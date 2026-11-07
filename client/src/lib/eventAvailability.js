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
  else if (event.status === 'completed') state = 'completed';
  else if (!Number.isFinite(date)) state = 'unconfirmed';
  else if (date <= now) state = 'past';
  else if (remaining === null || event.status !== 'upcoming') state = 'unconfirmed';
  else if (remaining === 0) state = 'full';
  const messages = {
    open: ['Registration open', 'A place for your curiosity. Join this campus experience.'],
    cancelled: ['Event cancelled', 'The organizer has cancelled this event. Registration is closed.'],
    completed: ['Event completed', 'This experience has finished. Find what’s happening next on campus.'],
    past: ['Registration closed', 'The scheduled start time has passed. New registrations are closed.'],
    full: ['Fully booked', 'All places are currently taken. There is no waitlist available.'],
    unconfirmed: ['Registration unavailable', 'Event availability cannot be confirmed right now.'],
  };
  return { state, capacity, remaining, canRegister: state === 'open', title: messages[state][0], description: messages[state][1] };
}
