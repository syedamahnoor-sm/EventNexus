import JourneySteps from '../components/JourneySteps';
import CampusMarquee from '../components/CampusMarquee';
import './HomeContinuity.css';
import './HomeDiscovery.css';
import BrandMark from '../components/BrandMark';
import { Link } from 'react-router-dom';
import Arrow from '../components/Arrow';
import EventResults from '../components/EventResults';
import Footer from '../components/Footer';
import useEvents from '../hooks/useEvents';
import { CATEGORIES, CATEGORY_COPY } from '../lib/events';

export default function Home() {
 const results = useEvents({ limit: 3 });
 return <><main tabIndex={-1} id="main" className="home-page">
 <section className="hero wrap"><div className="hero-copy"><p className="eyebrow entrance">THE CAMPUS IS YOURS. GO FIND YOUR THING.</p><h1 className="entrance"><span className="headline-line"><span>Your campus.</span></span><span className="headline-line"><span>More than</span></span><span className="headline-line"><em>classes.</em></span><span className="heading-star" aria-hidden="true"><BrandMark /></span></h1><div className="hero-bottom entrance"><p>The ideas. The people. The unexpected.<br />Find the experiences that make<br className="desktop-break" /> your university years yours.</p><Link to="/events" className="button lime">Explore events <Arrow diagonal /></Link></div></div>
 <div className="hero-poster entrance" aria-label="An editorial campus life poster: Be there. Be curious. Be you."><div className="poster-top"><span>THE CAMPUS<br />FIELD NOTES</span><span>VOL. 01<br />OPEN TO POSSIBILITY</span></div><div className="poster-type">BE THERE.<br /><span>BE CURIOUS.</span><br />BE YOU.</div><div className="poster-orbit" aria-hidden="true"><BrandMark /></div><div className="poster-ticket"><span>ADMIT YOUR<br /><strong>CURIOSITY.</strong></span><Arrow diagonal /><small>NO TWO JOURNEYS ALIKE.</small></div><div className="poster-bottom"><span>OUTSIDE THE SYLLABUS.</span><span>↗ EN</span></div></div>
 <div className="hero-foot"><span>LESS SCROLLING. MORE SHOWING UP.</span><a href="#happening">Take a look around ↓</a><span>DISCOVER / CONNECT / BELONG</span></div></section>
 <CampusMarquee />
 <section className="section wrap noticeboard" id="happening"><div className="noticeboard-bridge" aria-hidden="true"><span>01</span><span>FIELD NOTES / WHAT’S NEXT</span><Arrow diagonal /></div><div className="section-heading"><div><p className="eyebrow">01 / THE CAMPUS NOTICEBOARD</p><h2><span className="noticeboard-title">Next on your radar<span className="accent-dot">.</span></span></h2></div><Link className="text-link" to="/events">All events <Arrow diagonal /></Link></div><EventResults {...results} /></section>
 <section className="interests"><div className="wrap interests-layout"><div className="interests-intro"><p className="eyebrow">02 / FOLLOW THE SPARK</p><h2>Into something?<br /><em>Get into it.</em></h2><p>A familiar passion or a completely new direction. There’s room for both.</p><span className="interest-star" aria-hidden="true"><BrandMark /><small>PICK A DIRECTION.<br />SEE WHERE IT TAKES YOU.</small></span></div><div className="category-list">{CATEGORIES.map((category, index) => <Link key={category} to={`/events?category=${encodeURIComponent(category)}`}><span className="category-number">0{index + 1}</span><div><h3>{category}</h3><p>{CATEGORY_COPY[index]}</p></div><Arrow diagonal /></Link>)}</div></div><div className="surface-seam wrap" aria-hidden="true"><span>KEEP FOLLOWING THE SPARK</span><i className="seam-rule" /><span className="seam-mark"><BrandMark /></span></div></section>
 <section className="section wrap journey"><div className="section-heading"><div><p className="eyebrow">03 / FROM CURIOUS TO “I WAS THERE”</p><h2>Good things start<br />with showing up.</h2></div><p className="section-aside">You don’t need a grand plan.<br />Just a little curiosity.</p></div><JourneySteps /></section>
 <section className="closing"><div className="wrap"><p className="eyebrow">YOUR NEXT “GLAD I WENT” STARTS HERE.</p><h2>Make it a<br /><em>campus story.</em><span aria-hidden="true">↗</span></h2><div><p>There’s more to this place.<br />Go be part of it.</p><Link className="button lime" to="/events">Find your next thing <Arrow diagonal /></Link></div></div></section>
 </main><Footer editorial /></>;
}
