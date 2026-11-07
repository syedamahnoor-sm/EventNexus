import { Link } from 'react-router-dom';
import BrandMark from './BrandMark';
import Arrow from './Arrow';
import '../pages/Auth.css';

export default function AuthLayout({ registering, children }) {
  return <main id="main" tabIndex={-1} className="auth-page wrap">
    <section className="auth-story" aria-labelledby="auth-story-title">
      <p className="eyebrow">EVENTNEXUS / YOUR NEXT CHAPTER</p>
      <h1 id="auth-story-title" className="auth-headline">{registering ? <>Find your<br /><em>people.</em><br />Make your<br />mark.</> : <>There’s more<br />to your<br /><em>campus.</em></>}</h1>
      <div className="auth-composition" aria-hidden="true"><span className="auth-ring" /><BrandMark /><span className="auth-stamp">CURIOSITY<br />LOOKS GOOD<br />ON YOU. <Arrow diagonal /></span><span className="auth-caption">A PLACE TO BELONG. A REASON TO SHOW UP.</span></div>
      <div className="auth-story-bottom"><span>GOOD THINGS START WITH SHOWING UP.</span><Link to="/events">Take a look around <Arrow diagonal /></Link></div>
    </section>
    <section className="auth-form-section" aria-labelledby="auth-form-title">{children}</section>
    <footer className="auth-colophon"><span>CAMPUS LIFE. WIDE OPEN.</span><Link to="/events/past">A little campus history <Arrow diagonal /></Link><span>EVENTNEXUS / {new Date().getFullYear()}</span></footer>
  </main>;
}
