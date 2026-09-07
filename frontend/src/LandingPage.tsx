import { useState, type MouseEvent } from 'react';
import {
  ArrowDownLeft,
  ArrowRight,
  ArrowUpRight,
  Check,
  CheckCheck,
  ChevronRight,
  CircleDot,
  Code2,
  Fingerprint,
  Layers3,
  LockKeyhole,
  Menu,
  ShieldCheck,
  Wallet,
  X,
} from 'lucide-react';

type Props = { enter: (event: MouseEvent<HTMLAnchorElement>) => void };
const repo = 'https://github.com/FLUX-STELLAR/Flux';
const steps = [
  {
    title: 'Know exactly what’s needed.',
    description:
      'Start with a payout batch. Flux calculates the shortfall using your available balance, existing allocations, and operating reserve.',
    label: 'Calculate the shortfall',
    icon: CircleDot,
  },
  {
    title: 'Your policy. Your approval.',
    description:
      'Review the exact funding intent against your treasury limits. Every transfer starts with an explicit operator approval.',
    label: 'Approve with confidence',
    icon: ShieldCheck,
  },
  {
    title: 'Close the loop on every transfer.',
    description:
      'Follow funding from source to receipt. Reconcile the destination, asset, and amount before marking the batch ready for payout.',
    label: 'Reconcile, then release',
    icon: CheckCheck,
  },
];

function Brand() {
  return (
    <span className="lp-brand">
      <img src="/favicon.svg" alt="" width="34" height="34" />
      <span>
        flux<span>.</span>
      </span>
    </span>
  );
}
function StellarMark() {
  return (
    <svg viewBox="0 0 32 32" width="24" height="24" fill="none" aria-hidden="true">
      <path
        d="M7.5 19.5a9.5 9.5 0 0 1 15-11M24.5 12.5a9.5 9.5 0 0 1-15 11M4 23 28 9M4 18 28 4M4 28 28 14"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

export default function LandingPage({ enter }: Props) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [step, setStep] = useState(0);
  const launch = (event: MouseEvent<HTMLAnchorElement>) => {
    setMenuOpen(false);
    enter(event);
  };
  return (
    <div className="lp" id="top">
      <a className="lp-skip" href="#lp-main">
        Skip to content
      </a>
      <header className="lp-header">
        <a href="#top" aria-label="Flux home">
          <Brand />
        </a>
        <nav className="lp-desktop-nav" aria-label="Product navigation">
          <a href="#how-it-works">How it works</a>
          <a href="#built-for-control">Built for control</a>
          <a href={`${repo}/blob/main/docs/ARCHITECTURE.md`} target="_blank" rel="noreferrer">
            Developers <ArrowUpRight size={13} />
          </a>
        </nav>
        <a href="/app" onClick={launch} className="lp-button lp-button-small">
          Launch app <ArrowUpRight size={15} />
        </a>
        <button
          className="lp-menu-button"
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={menuOpen}
          aria-controls="lp-mobile-nav"
          onClick={() => setMenuOpen(!menuOpen)}
        >
          {menuOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
        {menuOpen && (
          <nav
            id="lp-mobile-nav"
            className="lp-mobile-nav"
            aria-label="Mobile product navigation"
            onKeyDown={(event) => {
              if (event.key === 'Escape') setMenuOpen(false);
            }}
          >
            <a href="#how-it-works" onClick={() => setMenuOpen(false)}>
              How it works <ArrowDownLeft size={16} />
            </a>
            <a href="#built-for-control" onClick={() => setMenuOpen(false)}>
              Built for control <ArrowDownLeft size={16} />
            </a>
            <a
              href={`${repo}/blob/main/docs/ARCHITECTURE.md`}
              target="_blank"
              rel="noreferrer"
              onClick={() => setMenuOpen(false)}
            >
              Developers <ArrowUpRight size={16} />
            </a>
          </nav>
        )}
      </header>
      <main id="lp-main" tabIndex={-1}>
        <section className="lp-hero" aria-labelledby="hero-title">
          <div className="lp-hero-copy">
            <a className="lp-announcement" href="#how-it-works">
              <span className="lp-status-dot" /> Purpose-built for Stellar payments{' '}
              <ChevronRight size={13} />
            </a>
            <h1 id="hero-title">
              Liquidity.
              <br />
              <span>Right on time.</span>
            </h1>
            <p>
              Keep your treasury flexible. Bring liquidity to Stellar
              <br className="lp-desktop-break" /> when your payouts need it, with control at every
              step.
            </p>
            <div className="lp-hero-actions">
              <a href="/app" onClick={launch} className="lp-button">
                Explore the workspace <ArrowUpRight size={17} />
              </a>
              <a href="#how-it-works" className="lp-text-link">
                See how it flows <ArrowRight size={16} />
              </a>
            </div>
            <span className="lp-sandbox-note">
              <span /> Interactive sandbox · Simulated funds
            </span>
          </div>

          <div
            className="lp-flow"
            aria-label="Illustrative funding flow: an EVM treasury funds a Stellar payout through Flux policy and reconciliation"
          >
            <div className="lp-flow-grid" aria-hidden="true" />
            <div className="lp-orbits" aria-hidden="true">
              <i />
              <i />
              <i />
            </div>
            <div className="lp-flow-label lp-flow-label-top">
              <span /> THE PATH FROM CAPITAL TO PAYOUT
            </div>
            <div className="lp-flow-body">
              <div className="lp-transfer-card lp-source-card">
                <div className="lp-card-header">
                  <span className="lp-network-icon">
                    <Wallet size={19} />
                  </span>
                  <div>
                    <strong>Your treasury</strong>
                    <span>EVM source network</span>
                  </div>
                  <span className="lp-card-indicator" />
                </div>
                <div className="lp-card-amount">
                  <span>Funding shortfall</span>
                  <strong>
                    18,230<span>.00</span>
                    <small>USDT0</small>
                  </strong>
                </div>
                <div className="lp-card-footer">
                  <ShieldCheck size={14} />
                  <span>Policy checked</span>
                  <Check size={14} />
                </div>
              </div>
              <div className="lp-connector" aria-hidden="true">
                <span />
                <i />
                <ArrowRight size={14} />
              </div>
              <div className="lp-flow-engine">
                <div className="lp-engine-logo">
                  <img src="/favicon.svg" width="76" height="76" alt="Flux" />
                </div>
                <span>Orchestrated by Flux</span>
                <small>Approve. Track. Reconcile.</small>
              </div>
              <div className="lp-connector lp-connector-second" aria-hidden="true">
                <span />
                <i />
                <ArrowRight size={14} />
              </div>
              <div className="lp-transfer-card lp-destination-card">
                <div className="lp-card-header">
                  <span className="lp-network-icon lp-stellar-icon">
                    <StellarMark />
                  </span>
                  <div>
                    <strong>Stellar settlement</strong>
                    <span>Destination account</span>
                  </div>
                  <span className="lp-card-indicator" />
                </div>
                <div className="lp-card-amount">
                  <span>Batch payout</span>
                  <strong>
                    18,430<span>.00</span>
                    <small>USDT0</small>
                  </strong>
                </div>
                <div className="lp-card-footer lp-ready">
                  <CheckCheck size={14} />
                  <span>Reconciled & ready</span>
                  <span className="lp-status-dot" />
                </div>
              </div>
            </div>
            <div className="lp-flow-bottom">
              <span>
                <LockKeyhole size={12} /> Operator-approved funding
              </span>
              <span>
                Illustrative sandbox flow <span className="lp-tiny-dot">·</span> Reserve preserved
              </span>
            </div>
          </div>
        </section>

        <section className="lp-principles" aria-label="Product principles">
          <div>
            <span className="lp-principle-index">01 /</span>
            <p>
              Fund the shortfall.
              <br />
              <strong>Keep capital flexible.</strong>
            </p>
          </div>
          <div>
            <span className="lp-principle-index">02 /</span>
            <p>
              Set the boundaries.
              <br />
              <strong>Stay in control.</strong>
            </p>
          </div>
          <div>
            <span className="lp-principle-index">03 /</span>
            <p>
              Follow the evidence.
              <br />
              <strong>Know when it’s ready.</strong>
            </p>
          </div>
        </section>

        <section
          className="lp-workflow lp-section"
          id="how-it-works"
          aria-labelledby="workflow-title"
        >
          <div className="lp-section-heading">
            <span className="lp-eyebrow">LESS GUESSWORK. MORE FLOW.</span>
            <h2 id="workflow-title">
              From payout plan
              <br />
              to funding-ready.
            </h2>
            <p>
              One connected workflow for the moments
              <br className="lp-desktop-break" /> that matter to your treasury.
            </p>
          </div>
          <div className="lp-workflow-layout">
            <div
              className="lp-steps"
              role="tablist"
              aria-label="Funding workflow"
              aria-orientation="vertical"
            >
              {steps.map((item, index) => (
                <button
                  key={item.label}
                  id={`lp-step-${index}`}
                  type="button"
                  role="tab"
                  aria-selected={step === index}
                  aria-controls="lp-workflow-panel"
                  tabIndex={step === index ? 0 : -1}
                  className={`lp-step ${step === index ? 'lp-step-active' : ''}`}
                  onClick={() => setStep(index)}
                  onKeyDown={(event) => {
                    let next = index;
                    if (event.key === 'ArrowDown') next = (index + 1) % steps.length;
                    else if (event.key === 'ArrowUp')
                      next = (index + steps.length - 1) % steps.length;
                    else if (event.key === 'Home') next = 0;
                    else if (event.key === 'End') next = steps.length - 1;
                    else return;
                    event.preventDefault();
                    setStep(next);
                    document.getElementById(`lp-step-${next}`)?.focus();
                  }}
                >
                  <span className="lp-step-number">0{index + 1}</span>
                  <span>
                    <strong>{item.title}</strong>
                    <span className="lp-step-description">{item.description}</span>
                  </span>
                  <ArrowUpRight size={18} />
                </button>
              ))}
            </div>
            <div
              className="lp-workflow-demo"
              id="lp-workflow-panel"
              role="tabpanel"
              aria-labelledby={`lp-step-${step}`}
              tabIndex={0}
            >
              <div className="lp-demo-topline">
                <span className="lp-demo-dots">
                  <i />
                  <i />
                  <i />
                </span>
                <span>FLUX WORKSPACE</span>
                <span className="lp-demo-sandbox">Sandbox</span>
              </div>
              <div className="lp-demo-content" key={step}>
                <div className="lp-demo-heading">
                  <span className="lp-demo-icon">
                    {step === 0 ? (
                      <ArrowDownLeft size={20} />
                    ) : step === 1 ? (
                      <ShieldCheck size={20} />
                    ) : (
                      <CheckCheck size={20} />
                    )}
                  </span>
                  <div>
                    <h3>Contractor payroll</h3>
                    <p>Batch funding request</p>
                  </div>
                  <span className={`lp-demo-badge ${step === 2 ? 'lp-demo-badge-ready' : ''}`}>
                    {['Calculated', 'Approval review', 'Reconciled'][step]}
                  </span>
                </div>
                {step === 0 ? (
                  <div className="lp-calculation">
                    <div>
                      <span>Batch payout</span>
                      <strong>18,430.00</strong>
                    </div>
                    <div>
                      <span>Minimum reserve</span>
                      <strong>+ 5,000.00</strong>
                    </div>
                    <div>
                      <span>Available Stellar balance</span>
                      <strong>− 5,200.00</strong>
                    </div>
                    <div className="lp-calculation-total">
                      <span>
                        Required top-up<small>USDT0 · Sandbox example</small>
                      </span>
                      <strong>
                        18,230<span>.00</span>
                      </strong>
                    </div>
                  </div>
                ) : step === 1 ? (
                  <div className="lp-approval">
                    <div className="lp-approval-amount">
                      <span>Exact funding intent</span>
                      <strong>
                        18,230.00 <small>USDT0</small>
                      </strong>
                    </div>
                    {[
                      'Operating reserve preserved',
                      'Within single-transfer limit',
                      'Destination matches policy',
                    ].map((label) => (
                      <div className="lp-check-row" key={label}>
                        <Check size={15} />
                        <span>{label}</span>
                      </div>
                    ))}
                    <div className="lp-approval-note">
                      <LockKeyhole size={14} /> Awaiting operator approval
                    </div>
                  </div>
                ) : (
                  <div className="lp-reconciliation">
                    {[
                      'Source transfer confirmed',
                      'Stellar receipt verified',
                      'Asset and amount matched',
                    ].map((label) => (
                      <div className="lp-check-row" key={label}>
                        <span className="lp-check-circle">
                          <Check size={12} />
                        </span>
                        <span>{label}</span>
                        <span>Verified</span>
                      </div>
                    ))}
                    <div className="lp-ready-banner">
                      <CheckCheck size={20} />
                      <div>
                        <strong>Ready for payout</strong>
                        <span>Evidence linked. Reserve preserved.</span>
                      </div>
                    </div>
                  </div>
                )}
                <div className="lp-demo-footer">
                  <Fingerprint size={14} />
                  <span>One batch. A complete evidence trail.</span>
                </div>
              </div>
              <span className="lp-demo-caption">
                WORKFLOW PREVIEW <span>0{step + 1} / 03</span>
              </span>
            </div>
          </div>
        </section>

        <section
          className="lp-controls lp-section"
          id="built-for-control"
          aria-labelledby="controls-title"
        >
          <div className="lp-control-heading">
            <div>
              <span className="lp-eyebrow">CONFIDENCE IS IN THE DETAILS.</span>
              <h2 id="controls-title">
                Capital moves.
                <br />
                Control stays with you.
              </h2>
            </div>
            <p>
              Built around the way payment operators work.
              <br />
              Clear limits, deliberate approvals, traceable outcomes.
            </p>
          </div>
          <div className="lp-feature-grid">
            <article>
              <span className="lp-feature-icon">
                <ShieldCheck size={24} />
              </span>
              <h3>Policy before movement.</h3>
              <p>
                Operating reserves, funding caps, and destination restrictions define what can move,
                before it does.
              </p>
              <span className="lp-feature-tag">Guardrails by design</span>
            </article>
            <article>
              <span className="lp-feature-icon">
                <Fingerprint size={24} />
              </span>
              <h3>Evidence at every step.</h3>
              <p>
                Connect the batch, approved intent, transfer, and receipt in one auditable funding
                history.
              </p>
              <span className="lp-feature-tag">From intent to receipt</span>
            </article>
            <article>
              <span className="lp-feature-icon">
                <Layers3 size={24} />
              </span>
              <h3>Your payout stack, connected.</h3>
              <p>
                Use the API and funding-ready events to connect treasury decisions to your payout
                workflow.
              </p>
              <a
                href={`${repo}/blob/main/docs/API_AND_OPERATIONS.md`}
                target="_blank"
                rel="noreferrer"
                className="lp-feature-link"
              >
                Explore the API <ArrowUpRight size={14} />
              </a>
            </article>
          </div>
        </section>

        <section className="lp-final-cta" aria-labelledby="cta-title">
          <div className="lp-cta-orbits" aria-hidden="true">
            <i />
            <i />
            <i />
          </div>
          <div className="lp-cta-content">
            <span className="lp-eyebrow">MEET YOUR NEXT TREASURY WORKFLOW.</span>
            <h2 id="cta-title">
              Put your liquidity
              <br />
              in motion.
            </h2>
            <p>
              Take a batch from funding request to reconciliation.
              <br />
              See the whole picture in the Flux sandbox.
            </p>
            <a href="/app" onClick={launch} className="lp-button lp-button-white">
              Enter the workspace <ArrowUpRight size={17} />
            </a>
            <span className="lp-cta-note">No wallet needed. Just a little curiosity.</span>
          </div>
          <div className="lp-cta-monogram" aria-hidden="true">
            <img src="/favicon.svg" width="150" height="150" alt="" />
          </div>
        </section>
      </main>
      <footer className="lp-footer">
        <div className="lp-footer-top">
          <a href="#top" aria-label="Flux home">
            <Brand />
          </a>
          <p>Just-in-time liquidity. Built for Stellar.</p>
          <a href={repo} target="_blank" rel="noreferrer">
            <Code2 size={16} /> View on GitHub <ArrowUpRight size={14} />
          </a>
        </div>
        <div className="lp-footer-bottom">
          <span>© {new Date().getFullYear()} Flux</span>
          <p>Currently in sandbox. Transfers and payouts are simulated.</p>
          <a href="#top">Back to top ↑</a>
        </div>
      </footer>
    </div>
  );
}
