import { useState } from 'react';

function GalleryPhoto({ photo }) {
  const [failed, setFailed] = useState(false);
  return <figure>{failed ? <div className="recap-photo-unavailable">Photograph unavailable</div> : <img src={photo.imageUrl} alt={photo.alt} loading="lazy" decoding="async" width="1280" height="800" onError={() => setFailed(true)} />}{photo.caption && <figcaption>{photo.caption}</figcaption>}</figure>;
}

export default function EventRecap({ event }) {
  return <section className="details-recap" id="recap" tabIndex={-1} aria-labelledby="recap-heading">
    <p className="eyebrow">FROM THE ORGANIZER</p><h2 id="recap-heading">In retrospect<span className="accent-dot">.</span></h2>
    {event.recap?.trim() && <p className="details-description">{event.recap}</p>}
    {event.highlights?.length > 0 && <><h3>Highlights</h3><ul>{event.highlights.map((highlight, index) => <li key={index}>{highlight}</li>)}</ul></>}
    {event.gallery?.length > 0 && <div className="recap-gallery">{event.gallery.map((photo, index) => <GalleryPhoto key={`${photo.imageUrl}-${index}`} photo={photo} />)}</div>}
  </section>;
}
