import BrandMark from './BrandMark';
import { Link } from 'react-router-dom';
import Arrow from './Arrow';
import { CATEGORIES, eventDate } from '../lib/events';

export default function EventCard({ event }) {
  const index = Math.max(0, CATEGORIES.indexOf(event.category));
  const remaining = Number.isFinite(event.capacity) ? Math.max(0, event.capacity - (event.registeredCount ?? 0)) : null;
  return <article className="event-card"><Link to={`/events/${event._id}`}>
    <div className={`event-art art-${index}`} aria-hidden="true"><span className="art-label">EVENTNEXUS / {event.category || 'Other'}</span><span className="art-symbol">{index === 1 || index === 5 ? <BrandMark /> : ["↗", "", "↯", "↗", "◎"][index]}</span><span className="art-bottom">A REASON TO SHOW UP.<span>EN / 0{index + 1}</span></span></div>
    <div className="card-meta"><span>{event.category || 'Other'}</span><span className={remaining === 0 ? 'full' : ''}>{remaining === null ? 'See availability' : remaining === 0 ? 'Fully booked' : `${remaining} places left`}</span></div>
    <h3>{event.title}</h3><p className="card-description">{event.description}</p>
    <div className="card-date"><time dateTime={event.date}>{eventDate(event.date)}</time><span>{event.location}</span></div>
    <div className="card-link">Take a closer look <Arrow diagonal /></div>
  </Link></article>;
}
