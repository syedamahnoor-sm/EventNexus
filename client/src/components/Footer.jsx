import BrandMark from './BrandMark';
import Arrow from './Arrow';
import { Link } from 'react-router-dom';
import './Footer.css';

export default function Footer({ editorial = false }) {
  if (!editorial) return <footer className="site-footer wrap"><Link className="wordmark" to="/"><BrandMark /><span className="brand-name">eventnexus</span></Link><p>Campus life. Wide open.</p><a href="#top">Back to top ↑</a><span className="footer-note">MADE FOR THE CAMPUS COMMUNITY</span></footer>;

  return <footer className="site-footer site-footer--editorial" aria-label="Site footer">
    <div className="wrap">
      <div className="footer-composition">
        <div className="footer-brand">
          <Link className="wordmark" to="/" aria-label="EventNexus home"><BrandMark /><span className="brand-name">eventnexus</span></Link>
          <p className="footer-statement">Campus life.<br /><em>Wide open.</em></p>
        </div>
        <div className="footer-wayfinding">
          <p className="eyebrow">THERE’S MORE TO THIS PLACE.</p>
          <nav aria-label="Footer navigation">
            <Link to="/">Home <Arrow diagonal /></Link>
            <Link to="/events">Explore events <Arrow diagonal /></Link>
            <Link to="/events/past">Previous events <Arrow diagonal /></Link>
            <Link to="/login">Account access <Arrow diagonal /></Link>
            <Link to="/register">Create an account <Arrow diagonal /></Link>
          </nav>
          <p className="footer-community">Made for the people who make campus happen.</p>
        </div>
      </div>
      <div className="footer-colophon">
        <small>© {new Date().getFullYear()} EventNexus</small>
        <span>FOLLOW YOUR CURIOSITY.</span>
        <a href="#top">Back to top <span aria-hidden="true">↑</span></a>
      </div>
    </div>
  </footer>;
}
