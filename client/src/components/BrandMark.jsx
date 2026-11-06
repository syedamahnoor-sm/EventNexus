/** Two open meeting frames, joined by one shared diagonal: an abstract EN. */
export default function BrandMark({ className = '', ...props }) {
  return <svg className={`brand-mark ${className}`} viewBox="0 0 48 48" fill="none" aria-hidden="true" {...props}>
    <path className="brand-frame" d="M20 8H8v32h12M28 8h12v32H28" stroke="currentColor" strokeWidth="5" strokeLinejoin="miter" />
    <path className="brand-connection" d="M8 24h12L28 8v32l12-16" stroke="currentColor" strokeWidth="5" strokeLinejoin="bevel" />
  </svg>;
}
