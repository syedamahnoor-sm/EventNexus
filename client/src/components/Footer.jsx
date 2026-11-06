import BrandMark from './BrandMark';
import { Link } from 'react-router-dom';
export default function Footer() {
 return <footer className="site-footer wrap"><Link className="wordmark" to="/"><BrandMark /><span className="brand-name">eventnexus</span></Link><p>Campus life. Wide open.</p><a href="#top">Back to top ↑</a><span className="footer-note">MADE FOR THE CAMPUS COMMUNITY</span></footer>;
}
