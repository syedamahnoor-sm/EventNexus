// No end instant exists. Past means the scheduled start has passed, never a verified end time.
function eventWindow(scope, status, now) {
  if (scope === 'past') return { status: status || { $in: ['upcoming', 'completed'] }, date: { $lte: now } };
  const filter = { status: status || 'upcoming' };
  if (filter.status === 'upcoming') filter.date = { $gt: now };
  if (filter.status === 'completed') filter.date = { $lte: now };
  return filter;
}
module.exports = { eventWindow };
