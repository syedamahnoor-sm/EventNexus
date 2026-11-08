import { activeRegistration } from './registrationLifecycle.js';
export function canCancelRegistration(event, registration, now = Date.now()) {
  return Boolean(registration?._id && activeRegistration(registration) && event?.status === 'upcoming' && Number.isFinite(new Date(event.date).getTime()) && new Date(event.date).getTime() > now);
}
