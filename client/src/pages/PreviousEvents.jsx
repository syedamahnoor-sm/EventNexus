import { useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import ArchiveEventCard from '../components/ArchiveEventCard';
import Arrow from '../components/Arrow';
import BrandMark from '../components/BrandMark';
import Footer from '../components/Footer';
import useEvents from '../hooks/useEvents';
import { CATEGORIES } from '../lib/events';
import './PreviousEvents.css';

export default function PreviousEvents() {
  const [params, setParams] = useSearchParams();
  const search = (params.get('search') || '').slice(0, 100);
  const category = CATEGORIES.includes(params.get('category')) ? params.get('category') : '';
  const sort = params.get('sort') === 'soonest' ? 'soonest' : 'latest';
  const inputPage = Number(params.get('page'));
  const page = Number.isSafeInteger(inputPage) && inputPage > 0 && inputPage <= 1000000 ? inputPage : 1;
  const results = useEvents({ scope: 'past', search, category, sort, page, limit: 6 });
  const filtered = Boolean(search.trim() || category);
  function update(name, value) {
    setParams(current => {
      const next = new URLSearchParams(current);
      value ? next.set(name, value) : next.delete(name);
      if (name !== 'page') next.delete('page');
      return next;
    }, { replace: name === 'search', preventScrollReset: true });
  }
  const clear = () => setParams({}, { preventScrollReset: true });
  useEffect(() => {
    const previous = document.title;
    document.title = 'Campus Rewind — Previous Events | EventNexus';
    return () => { document.title = previous; };
  }, []);
  useEffect(() => {
    if (!results.loading && !results.error && page > Math.max(1, results.pagination.totalPages)) {
      setParams(current => { const next = new URLSearchParams(current); next.delete('page'); return next; }, { replace: true, preventScrollReset: true });
    }
  }, [results.loading, results.error, results.pagination.totalPages, page, setParams]);

  return <><main id="main" tabIndex={-1} className="rewind-page wrap">
    <header className="rewind-intro entrance">
      <div className="rewind-masthead"><p className="eyebrow">THE EVENTNEXUS ARCHIVE</p><span>PREVIOUS EVENTS / CAMPUS REWIND</span></div>
      <div className="rewind-title"><h1>Good times.<br /><em>Great stories.</em></h1><div><p>A little look back at campus life.<br />Revisit past events, follow an old curiosity, and find the details worth keeping.</p><Link className="text-link" to="/events">Looking for what’s next? <Arrow diagonal /></Link></div></div>
      <div className="rewind-imprint"><span>CAMPUS REWIND</span><BrandMark /><span>THE MOMENTS STAY. THE STORY CONTINUES.</span></div>
    </header>
    <section className="rewind-filters" aria-label="Search previous events">
      <label className="rewind-search"><span className="sr-only">Search previous events</span><svg width="20" height="20" viewBox="0 0 24 24" stroke="currentColor" fill="none" strokeWidth="1.5" aria-hidden="true"><circle cx="10" cy="10" r="6.5" /><path d="m15 15 6 6" /></svg><input type="search" maxLength={100} value={search} onChange={event => update('search', event.target.value)} placeholder="A memory, a subject, a place…" /></label>
      <fieldset><legend className="eyebrow">FOLLOW AN INTEREST</legend><div className="rewind-categories">{['', ...CATEGORIES].map(value => <button key={value} className={category === value ? 'filter active' : 'filter'} aria-pressed={category === value} onClick={() => update('category', value)}>{value || 'All previous events'}</button>)}</div></fieldset>
    </section>
    <section className="rewind-results" aria-labelledby="rewind-results-heading" aria-busy={results.loading}>
      <div className="rewind-results-heading"><h2 id="rewind-results-heading">{category ? `${category}, revisited.` : 'From the archive.'}</h2><div><span role="status">{results.loading ? 'Opening the archive…' : results.error ? 'Archive unavailable' : `${results.pagination.total} past ${results.pagination.total === 1 ? 'event' : 'events'}`}</span>{filtered && <button className="reset-button" onClick={clear}>Reset filters ×</button>}<label className="sort-label"><span className="sr-only">Archive order</span><select value={sort} onChange={event => update('sort', event.target.value)}><option value="latest">Newest first</option><option value="soonest">Oldest first</option></select></label></div></div>
      {results.loading ? <div className="rewind-skeleton" role="status" aria-label="Loading previous events"><div /><div /></div> : results.error ? <div className="rewind-empty" role="alert"><BrandMark /><h3>The archive is out of reach.</h3><p>We couldn’t load previous events. Try again in a moment.</p><button className="button" onClick={results.retry}>Try again <Arrow /></button></div> : results.events.length === 0 ? <div className="rewind-empty"><BrandMark /><h3>{filtered ? 'A different trail, perhaps.' : 'The archive starts here.'}</h3><p>{filtered ? 'No previous events match this search. Try another interest or a different phrase.' : 'No past events are available yet. Upcoming campus experiences are on the noticeboard.'}</p>{filtered ? <button className="button" onClick={clear}>Reset filters <Arrow /></button> : <Link className="text-link" to="/events">Explore upcoming events <Arrow diagonal /></Link>}</div> : <div className="rewind-grid">{results.events.map((event, index) => <ArchiveEventCard key={event._id} event={event} priority={index === 0} />)}</div>}
      {!results.loading && !results.error && results.pagination.totalPages > 1 && <nav className="pagination" aria-label="Previous event pages"><button className="button secondary" disabled={page <= 1} onClick={() => update('page', String(page - 1))}>← Previous</button><span aria-live="polite">Page {results.pagination.page} of {results.pagination.totalPages}</span><button className="button secondary" disabled={!results.pagination.hasNextPage} onClick={() => update('page', String(page + 1))}>Next →</button></nav>}
    </section>
    <div className="rewind-closing"><p>Some things are worth<br /><em>looking back on.</em></p><Link className="text-link" to="/events">Make your next campus story <Arrow diagonal /></Link></div>
  </main><Footer /></>;
}
