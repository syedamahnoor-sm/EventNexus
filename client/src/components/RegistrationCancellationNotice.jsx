import { registrationStatus, activeRegistration } from '../lib/registrationLifecycle';
import { registrationDate } from '../lib/participants';
import './OrganizerRegistrationCancellation.css';
export default function RegistrationCancellationNotice({ registration }) {
  if (!registration || activeRegistration(registration)) return null;
  return <section className="participants-notice registration-history-notice" aria-label="Registration cancellation"><strong>{registrationStatus(registration)}</strong>{registration.cancellation?.at && <p>{registrationDate(registration.cancellation.at)}</p>}{registration.cancellation?.reason && <p className="cancellation-saved-reason">{registration.cancellation.reason}</p>}<p>This registration is no longer active. Your submitted details remain on record.</p><small>Registration reference: {registration._id}</small></section>;
}
