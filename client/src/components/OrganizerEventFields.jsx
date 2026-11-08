import { useState } from 'react';
import { CATEGORIES } from '../lib/events';
import { validEventImage } from '../lib/eventManagement';
import BrandMark from './BrandMark';

export default function OrganizerEventFields({ values, errors, change, registeredCount = 0 }) {
  const [preview, setPreview] = useState(''), [failed, setFailed] = useState(false);
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  function input(name, label, options = {}, hint) {
    return <div className={`event-editor-field event-editor-field--${name}`}><label htmlFor={`event-${name}`}>{label}{options.optional && <span> (optional)</span>}</label><input id={`event-${name}`} name={name} value={values[name]} onChange={change} type={options.type || 'text'} maxLength={options.max} min={options.min} step={options.step} required={!options.optional} autoComplete="off" aria-invalid={Boolean(errors[name])} aria-describedby={errors[name] || hint ? `event-${name}-help` : undefined} />{(errors[name] || hint) && <p id={`event-${name}-help`} className={errors[name] ? 'event-editor-field-error' : 'event-editor-field-hint'}>{errors[name] || hint}</p>}</div>;
  }
  return <>
    <section className="event-editor-section" aria-labelledby="event-story-heading"><div className="event-editor-section-heading"><span>01</span><div><h2 id="event-story-heading">Give it a story.</h2><p>A good reason to close the laptop and show up.</p></div></div>
      {input('title', 'Event title', { max: 120 }, '3–120 characters. Make the idea easy to recognize.')}
      <div className="event-editor-field"><label htmlFor="event-description">Description</label><textarea id="event-description" name="description" value={values.description} onChange={change} maxLength={2000} rows={7} required aria-invalid={Boolean(errors.description)} aria-describedby="event-description-help" /><p id="event-description-help" className={errors.description ? 'event-editor-field-error' : 'event-editor-field-hint'}>{errors.description || `${values.description.length}/2000 · Tell students what to expect. At least 10 characters.`}</p></div>
      <div className="event-editor-field"><label htmlFor="event-category">Category</label><select id="event-category" name="category" value={values.category} onChange={change} required aria-invalid={Boolean(errors.category)} aria-describedby={errors.category ? 'event-category-help' : undefined}>{CATEGORIES.map(category => <option key={category}>{category}</option>)}</select>{errors.category && <p className="event-editor-field-error" id="event-category-help">{errors.category}</p>}</div>
    </section>
    <section className="event-editor-section" aria-labelledby="event-logistics-heading"><div className="event-editor-section-heading"><span>02</span><div><h2 id="event-logistics-heading">Set the scene.</h2><p>The right place. The right time. Room for everyone.</p></div></div>
      {input('date', 'Date and time', { type: 'datetime-local', step: 'any' }, `Enter your local time (${timezone}). We save the exact instant in UTC; students see their local time.`)}
      {input('location', 'Venue / location', { max: 200 }, '3–200 characters. Include enough detail to find the room.')}
      {input('capacity', 'Maximum capacity', { type: 'number', min: Math.max(1, registeredCount), step: 1 }, registeredCount ? `${registeredCount} current registrations. Capacity cannot be lower than the saved registration count.` : 'A whole number of places, at least 1.')}
    </section>
    <section className="event-editor-section" aria-labelledby="event-image-heading"><div className="event-editor-section-heading"><span>03</span><div><h2 id="event-image-heading">Make an impression.</h2><p>A photograph that gives the experience a feeling.</p></div></div>
      {input('imageUrl', 'Event image URL', { optional: true, max: 2048 }, 'Paste a stable HTTPS image link you have permission to share. This is a URL, not a file upload. Existing event-library paths are also supported.')}
      {input('imageAlt', 'Image description', { optional: !values.imageUrl.trim(), max: 200 }, 'Describe the image for students using screen readers. Required when an image is supplied.')}
      <button className="text-link event-image-preview-trigger" type="button" disabled={!values.imageUrl.trim() || !validEventImage(values.imageUrl.trim())} onClick={() => { setPreview(values.imageUrl.trim()); setFailed(false); }}>Preview image ↗</button>
      <div className="event-image-preview">{preview && !failed ? <img src={preview} alt={values.imageAlt || 'Selected event image preview'} width="800" height="500" referrerPolicy="no-referrer" onError={() => setFailed(true)} /> : <><BrandMark /><span>{failed ? 'This image couldn’t load. Check the URL or choose another image.' : 'Your event image preview appears here.'}</span></>}</div>
      {preview && preview !== values.imageUrl.trim() && <p className="event-editor-field-hint">The URL changed. Preview again to see the new image.</p>}
    </section>
  </>;
}
