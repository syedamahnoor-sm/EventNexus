import { useSearchParams } from 'react-router-dom';
import { useEffect } from 'react';
import EventResults from '../components/EventResults';
import Footer from '../components/Footer';
import useEvents from '../hooks/useEvents';
import { CATEGORIES, PERIODS } from '../lib/events';

export default function Events() {
 const [params, setParams] = useSearchParams();
 const search = (params.get('search') || '').slice(0, 100);
 const category = CATEGORIES.includes(params.get('category')) ? params.get('category') : '';
 const period = ['week', 'month'].includes(params.get('period')) ? params.get('period') : '';
 const sort = params.get('sort') === 'latest' ? 'latest' : 'soonest';
 const pageValue = Number(params.get('page'));
 const page = Number.isSafeInteger(pageValue) && pageValue > 0 && pageValue <= 1000000 ? pageValue : 1;
 const results = useEvents({ search, category, period, sort, page });
 const filtered = Boolean(search.trim() || category || period);
 function update(name, value) {
  setParams(current => { const next = new URLSearchParams(current); value ? next.set(name, value) : next.delete(name); if (name !== 'page') next.delete('page'); return next; }, { replace: name === 'search', preventScrollReset: true });
 }
 function clear() { setParams({}, { preventScrollReset: true }); }
 useEffect(() => {
  if (!results.loading && !results.error && page > Math.max(1, results.pagination.totalPages)) {
   setParams(current => { const next = new URLSearchParams(current); next.delete('page'); return next; }, { replace: true, preventScrollReset: true });
  }
 }, [results.loading, results.error, results.pagination.totalPages, page, setParams]);
 return <><main className="explore-page wrap" id="main"><section className="explore-intro entrance"><div><p className="eyebrow">THE CAMPUS NOTICEBOARD / OPEN TO EVERYONE</p><h1>Find your <em>next thing.</em></h1></div><p>A new skill. A new circle. A new perspective.<br />It all starts with a little curiosity.</p></section>
 <section aria-label="Filter events" className="discovery-controls"><div className="search-row"><label className="search-box"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><circle cx="10.5" cy="10.5" r="7"/><path d="m16 16 5 5"/></svg><span className="sr-only">Search events, topics, or locations</span><input type="search" placeholder="An event, an interest, a place…" maxLength={100} value={search} onChange={event => update('search', event.target.value)} /><span className="search-hint">FIND YOUR SPARK ↗</span></label></div>
 <fieldset className="category-filters"><legend className="eyebrow">YOUR INTERESTS</legend><div>{['', ...CATEGORIES].map(value => <button key={value} aria-pressed={category === value} className={category === value ? 'filter active' : 'filter'} onClick={() => update('category', value)}>{value || 'All events'}{category === value && <span aria-hidden="true"> ↗</span>}</button>)}</div></fieldset>
 <div className="date-sort"><fieldset className="date-filters"><legend className="sr-only">Event date</legend><span className="eyebrow">WHEN</span>{PERIODS.map(({ value, label }) => <button key={value} aria-pressed={period === value} className={period === value ? 'date-filter active' : 'date-filter'} onClick={() => update('period', value)}>{label}</button>)}</fieldset><label className="sort-label">Sort by <select value={sort} onChange={event => update('sort', event.target.value)}><option value="soonest">Soonest first</option><option value="latest">Latest first</option></select></label></div></section>
 <section className="results-section" aria-label="Event results" aria-busy={results.loading}><div className="results-heading"><h2>{category || 'All upcoming'} events<span className="accent-dot">.</span></h2><div><span role="status">{results.loading ? 'Finding your next thing…' : results.error ? 'Results unavailable' : `${results.pagination.total} ${results.pagination.total === 1 ? 'event' : 'events'} found`}</span>{filtered && <button className="reset-button" onClick={clear}>Reset filters ×</button>}</div></div><EventResults {...results} filtered={filtered} clear={clear} />
 {!results.loading && !results.error && results.pagination.totalPages > 1 && <nav className="pagination" aria-label="Event pages"><button className="button secondary" disabled={page <= 1} onClick={() => update('page', String(page - 1))}>← Previous</button><span aria-live="polite">Page {page} of {results.pagination.totalPages}</span><button className="button secondary" disabled={!results.pagination.hasNextPage} onClick={() => update('page', String(page + 1))}>Next →</button></nav>}</section><div className="explore-note"><span aria-hidden="true">✳</span><p>Good things happen<br /><strong>when we show up.</strong></p><span>FOLLOW YOUR CURIOSITY. SEE WHERE IT GOES.</span></div></main><Footer /></>;
}
