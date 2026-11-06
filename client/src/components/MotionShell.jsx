import { useEffect, useLayoutEffect, useRef } from 'react';
import { useLocation, useNavigationType } from 'react-router-dom';

/** Motion uses local CSS variables and one frame per pointer/scroll update; no React render loop. */
export default function MotionShell({ children }) {
  const { pathname, hash } = useLocation();
  const navigationType = useNavigationType();
  const stage = useRef(null);
  const positions = useRef(new Map());
  const firstVisit = useRef(true);
  const pointerFrame = useRef(0);

  useLayoutEffect(() => {
    const oldRestoration = window.history.scrollRestoration;
    window.history.scrollRestoration = 'manual';
    if (!firstVisit.current) {
      const y = navigationType === 'POP' ? positions.current.get(pathname) || 0 : 0;
      window.scrollTo({ top: y, behavior: 'instant' });
      if (navigationType !== 'POP') stage.current?.querySelector('main')?.focus({ preventScroll: true });
    }
    firstVisit.current = false;
    if (hash) document.getElementById(hash.slice(1))?.scrollIntoView();
    const cache = positions.current;
    return () => {
      cache.set(pathname, window.scrollY);
      window.history.scrollRestoration = oldRestoration;
    };
    // Filter/query updates deliberately preserve scroll and focus.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  useEffect(() => {
    const root = stage.current;
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    let observer;
    if (!media.matches && 'IntersectionObserver' in window) {
      observer = new IntersectionObserver(entries => {
        entries.forEach(entry => {
          if (!entry.isIntersecting) return;
          entry.target.dataset.inView = 'true';
          observer.unobserve(entry.target);
        });
      }, { threshold: 0.12 });
      root.querySelectorAll('.section-heading, .category-list, .journey-steps, .closing, .surface-seam').forEach(element => observer.observe(element));
    }
    return () => { observer?.disconnect(); cancelAnimationFrame(pointerFrame.current); };
  }, [pathname]);

  function move(event) {
    if (event.pointerType !== 'mouse' || !window.matchMedia('(hover: hover) and (prefers-reduced-motion: no-preference)').matches) return;
    const target = event.target.closest('.hero-poster, .event-art, .button.lime, .category-list>a, .journey-step');
    if (!target) return;
    const bounds = target.getBoundingClientRect();
    const x = (event.clientX - bounds.left) / bounds.width - 0.5;
    const y = (event.clientY - bounds.top) / bounds.height - 0.5;
    cancelAnimationFrame(pointerFrame.current);
    pointerFrame.current = requestAnimationFrame(() => {
      target.style.setProperty('--pointer-x', x.toFixed(3));
      target.style.setProperty('--pointer-y', y.toFixed(3));
    });
  }
  function reset(event) {
    const target = event.target.closest('.hero-poster, .event-art, .button.lime, .category-list>a, .journey-step');
    if (!target || target.contains(event.relatedTarget)) return;
    cancelAnimationFrame(pointerFrame.current);
    target.style.setProperty('--pointer-x', 0);
    target.style.setProperty('--pointer-y', 0);
  }
  return <div ref={stage} key={pathname} className="motion-stage" onPointerMove={move} onPointerOut={reset}>{children}</div>;
}
