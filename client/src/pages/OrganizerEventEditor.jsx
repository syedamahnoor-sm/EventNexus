import { useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import useOwnedEvent from '../hooks/useOwnedEvent';
import { canManageEvent } from '../lib/eventManagement';
import OrganizerEventForm from '../components/OrganizerEventForm';
import Arrow from '../components/Arrow';
import BrandMark from '../components/BrandMark';
import './OrganizerEventEditor.css';

function EditContent({ id }) {
  const owned = useOwnedEvent(id);
  if (!owned.event) return <div className="event-editor-unavailable" role={owned.loading ? 'status' : 'alert'}><h2>{owned.loading ? 'Opening your event.' : 'This event is unavailable.'}</h2><p>{owned.loading ? 'Finding the details in your workspace…' : owned.error === 'missing' ? 'The event doesn’t exist in your workspace, or has been removed.' : owned.error === 'invalid' ? 'Check the event address and return to your workspace.' : 'We couldn’t load your event. Your saved draft is kept.'}</p>{owned.error === 'network' && <button className="button" type="button" onClick={owned.reload}>Try again <Arrow /></button>}<Link className="text-link" to="/organizer/dashboard">Back to workspace <Arrow /></Link></div>;
  if (!canManageEvent(owned.event)) return <div className="event-editor-unavailable"><p className="eyebrow">A RECORD WORTH KEEPING</p><h2>This chapter is preserved.</h2><p>Past, cancelled, and completed event details are read-only. Passing the scheduled start does not verify completion or attendance.</p><Link className="button" to={`/events/${id}`}>View event record <Arrow diagonal /></Link></div>;
  return <>{owned.error && <p className="event-editor-feedback" role="alert">The latest event could not be loaded. Reconnect before saving. <button type="button" onClick={owned.reload}>Try again</button></p>}{!owned.error && <OrganizerEventForm event={owned.event} reload={owned.reload} />}</>;
}
export default function OrganizerEventEditor() {
  const { id } = useParams(), { user } = useAuth();
  useEffect(() => { const previous = document.title; document.title = `${id ? 'Edit your event' : 'Make a campus moment'} | EventNexus`; return () => { document.title = previous; }; }, [id]);
  return <main id="main" tabIndex={-1} className="event-editor wrap"><Link to="/organizer/dashboard" className="event-editor-back">← Back to your workspace</Link><header className="event-editor-header entrance"><p className="eyebrow">YOUR EVENTNEXUS / {id ? 'REFINE THE DETAILS' : 'MAKE SOMETHING HAPPEN'}</p><h1>{id ? <>A good idea.<br /><em>Even better.</em></> : <>Your idea.<br /><em>Their next story.</em></>}</h1><p>{id ? 'Thoughtful changes, without losing the people already part of the plan.' : 'Bring people together around something worth showing up for.'}</p></header><div className="event-editor-layout"><aside className="event-editor-aside"><BrandMark /><p>THE IDEA<br />IS ONLY<br /><em>the beginning.</em></p><div><span>CURATED BY</span><strong>{user.name}</strong><small>A few details. A whole new possibility.</small></div><nav aria-label="Event form sections"><a href="#event-story-heading">01 / The story</a><a href="#event-logistics-heading">02 / The essentials</a><a href="#event-image-heading">03 / The impression</a></nav></aside>{id ? <EditContent key={`${user.id}:${id}`} id={id} /> : <OrganizerEventForm key={`${user.id}:new`} />}</div></main>;
}
