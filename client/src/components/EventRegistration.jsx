import { Link } from 'react-router-dom';
import Arrow from './Arrow';
import { useAuth } from '../auth/AuthContext';
import useMyEventRegistration from '../hooks/useMyEventRegistration';

export default function EventRegistration({ event, availability }) {
  const auth = useAuth();
  const account = useMyEventRegistration(event._id);
  const destination = `/events/${event._id}/register`;
  function action() {
    if (account.loading) return <p role="status">Checking your session and registration…</p>;
    if (account.registration) return <><p className="registered-note">Your registration is recorded.</p><Link className="text-link" to={destination}>View confirmation <Arrow /></Link></>;
    if (!availability.canRegister) return <p>New registrations are unavailable for this event.</p>;
    if (auth.status === 'error' || account.error) return <><p>We couldn’t verify your session or registration.</p><button className="button secondary" onClick={() => { auth.refresh(); account.refresh(); }}>Check again <Arrow /></button></>;
    if (!auth.user) return <><Link className="button lime" to="/login" state={{ from: destination }}>Register now <Arrow diagonal /></Link><p>Log in with a student account, then complete your registration details.</p></>;
    if (auth.role !== 'student') return <p>Registration is available to student accounts. You’re signed in as an organizer.</p>;
    return <><Link className="button lime" to={destination}>Register now <Arrow diagonal /></Link><p>Complete your details and review before reserving a place.</p></>;
  }
  return <aside className="registration-panel" aria-labelledby="registration-heading"><p className="eyebrow">YOUR PLACE IN THE STORY</p><h2 id="registration-heading">{account.registration ? 'You’re on the list.' : 'Be part of it.'}</h2><div className={`registration-status status-${availability.state}`}><span aria-hidden="true" />{availability.title}</div><p className="registration-copy">{availability.description}</p><div className="seat-count"><strong>{availability.remaining ?? '—'}</strong><span>places remaining<br />{availability.capacity ? `of ${availability.capacity} total places` : 'Capacity unconfirmed'}</span></div>{availability.capacity && availability.remaining !== null && <meter className="seat-meter" min="0" max={availability.capacity} value={availability.remaining} aria-label={`${availability.remaining} seats remaining out of ${availability.capacity}`} />}<div className="registration-action">{action()}</div><p className="registration-footnote">Opening the form does not reserve a seat. Availability is confirmed on submission.</p></aside>;
}
