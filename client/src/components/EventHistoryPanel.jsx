import { Link } from 'react-router-dom';
import Arrow from './Arrow';

export default function EventHistoryPanel() {
  return <aside className="registration-panel history-panel" aria-labelledby="history-heading">
    <p className="eyebrow">THE EVENTNEXUS ARCHIVE</p>
    <h2 id="history-heading">A moment<br /><em>on record.</em></h2>
    <div className="registration-status"><span aria-hidden="true" />Past event</div>
    <p className="registration-copy">The scheduled date has passed. Registration is closed, but the event information stays here to revisit.</p>
    <Link className="text-link" to="/events/past">Previous events <Arrow diagonal /></Link>
    <Link className="history-next text-link" to="/events">Find what’s next <Arrow /></Link>
  </aside>;
}
