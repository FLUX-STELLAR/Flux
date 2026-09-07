import { lazy, Suspense, useEffect, useRef, useState, type MouseEvent } from 'react';
import LandingPage from './LandingPage.js';
import './landing.css';

const Workspace = lazy(() => import('./App.js'));
const isWorkspace = () => /^\/app\/?$/.test(window.location.pathname);

function WorkspaceView({ focusContent }: { focusContent: boolean }) {
  useEffect(() => {
    if (!focusContent) return;
    const main = document.querySelector<HTMLElement>('.main-shell main');
    main?.setAttribute('tabindex', '-1');
    main?.focus({ preventScroll: true });
  }, [focusContent]);
  return <Workspace />;
}

export default function Experience() {
  const [workspace, setWorkspace] = useState(isWorkspace);
  const [entering, setEntering] = useState(false);
  const skipRef = useRef<HTMLButtonElement>(null);
  const launched = useRef(false);

  useEffect(() => {
    const sync = () => {
      setWorkspace(isWorkspace());
      setEntering(false);
    };
    window.addEventListener('popstate', sync);
    return () => window.removeEventListener('popstate', sync);
  }, []);

  useEffect(() => {
    document.title = workspace ? 'Flux — Treasury workspace' : 'Flux — Liquidity, right on time.';
  }, [workspace]);

  useEffect(() => {
    if (!entering) return;
    skipRef.current?.focus();
    const timer = window.setTimeout(() => setEntering(false), 1700);
    return () => window.clearTimeout(timer);
  }, [entering]);

  const enter = (event: MouseEvent<HTMLAnchorElement>) => {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey)
      return;
    event.preventDefault();
    launched.current = true;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.history.pushState({}, '', '/app');
    window.scrollTo({ top: 0, behavior: 'instant' });
    setEntering(!reducedMotion);
    setWorkspace(true);
  };

  return (
    <>
      <div inert={entering}>
        {workspace ? (
          <Suspense
            fallback={
              <div className="flux-workspace-loading" role="status">
                <img src="/favicon.svg" width="48" height="48" alt="" />
                <span>Opening your workspace…</span>
              </div>
            }
          >
            <WorkspaceView focusContent={!entering && launched.current} />
          </Suspense>
        ) : (
          <LandingPage enter={enter} />
        )}
      </div>
      {entering && (
        <div
          className="flux-intro"
          role="dialog"
          aria-modal="true"
          aria-label="Entering the Flux workspace"
          onKeyDown={(event) => {
            if (event.key === 'Escape') setEntering(false);
            if (event.key === 'Tab') {
              event.preventDefault();
              skipRef.current?.focus();
            }
          }}
        >
          <div className="flux-intro-orbit" aria-hidden="true">
            <i />
            <i />
            <i />
          </div>
          <div className="flux-intro-content">
            <img src="/favicon.svg" width="72" height="72" alt="Flux" />
            <h1>Everything in flow.</h1>
            <p>Your treasury workspace awaits.</p>
            <span className="flux-intro-progress" aria-hidden="true">
              <i />
            </span>
          </div>
          <button ref={skipRef} className="flux-intro-skip" onClick={() => setEntering(false)}>
            Skip intro <span aria-hidden="true">↗</span>
          </button>
          <span className="flux-intro-caption">FLUX / TREASURY WORKSPACE</span>
        </div>
      )}
    </>
  );
}
