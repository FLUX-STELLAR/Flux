import { useCallback, useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import {
  Activity,
  ArrowDownLeft,
  ArrowRight,
  ArrowUpRight,
  Bell,
  Check,
  CheckCheck,
  Code2,
  Copy,
  Download,
  FileText,
  FlaskConical,
  Layers3,
  LayoutDashboard,
  LoaderCircle,
  LockKeyhole,
  Menu,
  Pause,
  Play,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Wallet,
  X,
  Zap,
  AlertTriangle,
} from 'lucide-react';
import type {
  AuditEvent,
  CreateFunding,
  FundingRequest,
  FundingStatus,
  OutboxEvent,
  Overview,
  Scenario,
} from '../shared/types.js';
import { formatAmount, shortfall } from '../shared/money.js';

const money = (v: string | number) =>
  new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(
    Number(v),
  );
const date = (v: string) =>
  new Date(v).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
const statusLabels: Record<FundingStatus, string> = {
  AWAITING_APPROVAL: 'Needs approval',
  APPROVED: 'Ready to fund',
  SOURCE_SUBMITTED: 'Submitted',
  SOURCE_CONFIRMED: 'Source confirmed',
  IN_TRANSIT: 'In transit',
  STELLAR_RECEIVED: 'Received',
  RECONCILED: 'Reconciled',
  ATTENTION_REQUIRED: 'Needs attention',
  NO_FUNDING_REQUIRED: 'Already funded',
  CANCELLED: 'Cancelled',
  EXPIRED: 'Expired',
};
const inFlight = (s: FundingStatus) =>
  ['SOURCE_SUBMITTED', 'SOURCE_CONFIRMED', 'IN_TRANSIT', 'STELLAR_RECEIVED'].includes(s);
const friendly = (s: string) => s.replaceAll('.', ' · ').replaceAll('_', ' ');
let localSession: string | undefined;
async function api<T>(path: string, body?: unknown, method?: string): Promise<T> {
  const response = await fetch(`/api/v1${path}`, {
    method: method ?? (body === undefined ? 'GET' : 'POST'),
    headers: {
      'Content-Type': 'application/json',
      ...(localSession ? { 'X-Flux-Session': localSession } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error?.message || 'Request failed.');
  return data;
}
function download(data: unknown, name: string) {
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }),
  );
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}
function Logo({ small = false }: { small?: boolean }) {
  return (
    <span className={`logo ${small ? 'small' : ''}`}>
      <svg viewBox="0 0 40 40" aria-hidden="true">
        <path d="M10 10h23l-7 9H16L7 32l5-17h12l2-3H10z" fill="currentColor" />
      </svg>
      {!small && (
        <span>
          flux<span className="logo-dot">.</span>
        </span>
      )}
    </span>
  );
}
function Badge({ status }: { status: FundingStatus }) {
  return (
    <span className={`badge status-${status.toLowerCase()}`}>
      <span />
      {statusLabels[status]}
    </span>
  );
}
function Modal({
  children,
  close,
  title,
  wide = false,
}: {
  children: ReactNode;
  close: () => void;
  title: string;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    ref.current?.showModal();
  }, []);
  return (
    <dialog
      ref={ref}
      className={`modal ${wide ? 'wide' : ''}`}
      onCancel={close}
      onClick={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <div className="modal-content">
        <div className="modal-heading">
          <h2>{title}</h2>
          <button aria-label="Close dialog" className="icon-button" onClick={close}>
            <X size={20} />
          </button>
        </div>
        {children}
      </div>
    </dialog>
  );
}
type Page = 'overview' | 'requests' | 'policy' | 'audit' | 'integrations';
const navigation: { id: Page; label: string; icon: typeof Activity }[] = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'requests', label: 'Funding requests', icon: ArrowDownLeft },
  { id: 'policy', label: 'Treasury policy', icon: SlidersHorizontal },
  { id: 'audit', label: 'Activity & audit', icon: Activity },
  { id: 'integrations', label: 'Integrations', icon: Layers3 },
];

export default function App() {
  const [overview, setOverview] = useState<Overview | null>(null);
  const [page, setPage] = useState<Page>('overview');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [notification, setNotification] = useState<{ text: string; error?: boolean } | null>(null);
  const [loadError, setLoadError] = useState('');
  const [busy, setBusy] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const reload = useCallback(async () => {
    const data = await api<Overview>('/overview');
    setOverview(data);
    setLoadError('');
  }, []);
  useEffect(() => {
    let stopped = false;
    const load = async () => {
      try {
        const session = await fetch('/api/session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: '{}',
        });
        if (!session.ok) throw new Error('Unable to open local workspace.');
        const sessionData = (await session.json()) as { session_token: string };
        localSession = sessionData.session_token;
        if (!stopped) await reload();
      } catch (e) {
        if (!stopped) setLoadError((e as Error).message);
      }
    };
    void load();
    const timer = setInterval(() => {
      if (!stopped) void reload().catch((e) => setLoadError(e.message));
    }, 2000);
    return () => {
      stopped = true;
      clearInterval(timer);
    };
  }, [reload]);
  useEffect(() => {
    if (!notification) return;
    const t = setTimeout(() => setNotification(null), 5500);
    return () => clearTimeout(t);
  }, [notification]);
  const notify = (text: string, error = false) => setNotification({ text, error });
  const action = async (fn: () => Promise<unknown>, success: string) => {
    setBusy(true);
    try {
      await fn();
      await reload();
      notify(success);
    } catch (e) {
      notify((e as Error).message, true);
    } finally {
      setBusy(false);
    }
  };
  const selectPage = (id: Page) => {
    setPage(id);
    setMobileOpen(false);
  };
  const selected = overview?.requests.find((r) => r.id === selectedId);
  const attention = overview?.metrics.attention_count ?? 0;
  return (
    <div className="app-shell">
      <aside className={`sidebar ${mobileOpen ? 'mobile-open' : ''}`}>
        <a
          className="brand"
          href="#"
          onClick={(e) => {
            e.preventDefault();
            selectPage('overview');
          }}
          aria-label="Flux overview"
        >
          <Logo />
        </a>
        <div className="workspace">
          <div className="workspace-avatar">A</div>
          <div>
            <strong>Acme Payments</strong>
          </div>
        </div>
        <nav aria-label="Main navigation">
          {navigation.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              className={`nav-item ${page === id ? 'active' : ''}`}
              onClick={() => selectPage(id)}
            >
              <Icon size={19} />
              <span>{label}</span>
              {id === 'requests' && !!overview?.metrics.approval_count && (
                <span className="nav-count">{overview.metrics.approval_count}</span>
              )}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="profile">
            <div className="profile-avatar">OP</div>
            <div>
              <strong>Local operator</strong>
              <span>Administrator</span>
            </div>
            <ShieldCheck size={17} />
          </div>
        </div>
      </aside>
      {mobileOpen && (
        <button
          className="mobile-backdrop"
          aria-label="Close navigation"
          onClick={() => setMobileOpen(false)}
        />
      )}
      <div className="main-shell">
        <header className="topbar">
          <div className="breadcrumb">
            <button
              className="icon-button menu-toggle"
              aria-label="Open navigation"
              onClick={() => setMobileOpen(true)}
            >
              <Menu size={20} />
            </button>
            <span>Workspace</span>
          </div>
          <div className="topbar-right">
            <span className="environment" title="Sandbox · Simulated funds only">
              <FlaskConical size={13} />
              Sandbox
            </span>
            <span
              className={`observer-state ${loadError ? 'offline' : ''}`}
              role="status"
              aria-label={loadError ? 'Reconnecting' : 'Observer online'}
              title={loadError ? 'Reconnecting' : 'Observer online'}
            >
              <span className="dot" />
            </span>
            <span className="topbar-divider" />
            <button
              className="icon-button notification-button"
              aria-label="View exceptions"
              onClick={() => selectPage('requests')}
            >
              <Bell size={19} />
              {attention > 0 && <span />}
            </button>
          </div>
        </header>
        <main>
          {loadError && (
            <div className="error-banner" role="alert">
              <AlertTriangle size={17} />
              {loadError}
              <button onClick={() => void reload().catch((e) => notify(e.message, true))}>
                Retry
              </button>
            </div>
          )}
          {!overview ? (
            <div className="loading">
              <LoaderCircle size={28} className="spin" />
              <h2>Loading workspace</h2>
            </div>
          ) : (
            <>
              <div className="page-heading">
                <div>
                  <h1>{navigation.find((n) => n.id === page)?.label}</h1>
                </div>
                <div className="heading-actions">
                  {page === 'overview' && (
                    <button
                      className="button secondary export-button"
                      aria-label="Export report"
                      title="Export report"
                      onClick={() => {
                        download(overview, 'flux-sandbox-report.json');
                        notify('Workspace report exported.');
                      }}
                    >
                      <Download size={16} />
                    </button>
                  )}
                  {(page === 'overview' || page === 'requests') && (
                    <button
                      className="button primary"
                      aria-label="New funding request"
                      onClick={() => setCreating(true)}
                    >
                      <Plus size={18} />
                      New request
                    </button>
                  )}
                </div>
              </div>
              {overview.policy.paused && (
                <div className="pause-banner">
                  <Pause size={17} />
                  <span>New funding is paused. Submitted transfers are still being observed.</span>
                  <button onClick={() => selectPage('policy')}>
                    Manage policy
                    <ArrowRight size={15} />
                  </button>
                </div>
              )}
              {page === 'overview' && (
                <OverviewPage
                  data={overview}
                  select={setSelectedId}
                  openRequests={() => selectPage('requests')}
                  create={() => setCreating(true)}
                />
              )}
              {page === 'requests' && (
                <RequestsTable
                  data={overview}
                  select={setSelectedId}
                  full
                  create={() => setCreating(true)}
                />
              )}
              {page === 'policy' && <PolicyPage data={overview} busy={busy} action={action} />}
              {page === 'audit' && <AuditPage events={overview.events} notify={notify} />}
              {page === 'integrations' && <IntegrationsPage notify={notify} />}
            </>
          )}
        </main>
      </div>
      {creating && overview && (
        <CreateModal
          data={overview}
          close={() => setCreating(false)}
          created={async (r) => {
            await reload();
            setCreating(false);
            setSelectedId(r.id);
            notify('Funding request created.');
          }}
        />
      )}
      {selected && overview && (
        <RequestModal
          request={selected}
          data={overview}
          close={() => setSelectedId(null)}
          action={action}
          busy={busy}
          notify={notify}
        />
      )}
      {notification && (
        <div
          className={`toast ${notification.error ? 'error' : ''}`}
          role={notification.error ? 'alert' : 'status'}
        >
          {notification.error ? <AlertTriangle size={18} /> : <Check size={18} />}
          <span>{notification.text}</span>
          <button
            className="icon-button"
            onClick={() => setNotification(null)}
            aria-label="Dismiss notification"
          >
            <X size={16} />
          </button>
        </div>
      )}
    </div>
  );
}

function OverviewPage({
  data,
  select,
  openRequests,
  create,
}: {
  data: Overview;
  select: (id: string) => void;
  openRequests: () => void;
  create: () => void;
}) {
  return (
    <>
      <div className="metrics-grid">
        <Metric
          label="Settlement balance"
          value={`$${money(data.account.balance)}`}
          icon={<Wallet size={19} />}
          detail={
            <>
              {data.account.asset}
              <span className="metric-separator">·</span>Stellar
            </>
          }
        />
        <Metric
          label="Pending funding"
          value={`$${money(data.metrics.pending_amount)}`}
          icon={<ArrowDownLeft size={19} />}
          detail={<>{data.metrics.approval_count} awaiting approval</>}
        />
        <Metric
          label="Settled volume"
          value={`$${money(data.metrics.routed_volume)}`}
          icon={<CheckCheck size={19} />}
          detail={
            <>
              {data.metrics.reconciled_count}{' '}
              {data.metrics.reconciled_count === 1 ? 'transfer' : 'transfers'}
            </>
          }
        />
      </div>
      <div className="overview-middle">
        <section className="panel liquidity-panel">
          <div className="panel-heading">
            <h2>Balance</h2>
            <span className="small-text">Reserve ${money(data.policy.minimum_reserve)}</span>
          </div>
          <BalanceChart data={data} />
          <div className="chart-legend">
            <span>
              <i className="legend-balance" />
              Balance
            </span>
            <span>
              <i className="legend-reserve" />
              Reserve
            </span>
          </div>
        </section>
        <section className="panel route-panel">
          <div className="panel-heading">
            <h2>Accounts</h2>
            <ArrowUpRight size={18} aria-hidden="true" />
          </div>
          <div className="route-node">
            <span className="chain-icon evm">
              <Layers3 size={23} />
            </span>
            <div>
              <strong>EVM treasury</strong>
              <span>
                ${money(data.treasury.balance)} <small>USDT0</small>
              </span>
            </div>
          </div>
          <div className="route-connector">
            <ArrowDownLeft size={15} />
          </div>
          <div className="route-node">
            <span className="chain-icon stellar">≋</span>
            <div>
              <strong>Stellar settlement</strong>
              <span>
                ${money(data.account.balance)} <small>USDT0</small>
              </span>
            </div>
          </div>
          <div className="route-foot">
            <ShieldCheck size={14} />
            Manual approval
          </div>
        </section>
      </div>
      <RequestsTable data={data} select={select} openAll={openRequests} create={create} />
    </>
  );
}

function Metric({
  label,
  value,
  icon,
  detail,
}: {
  label: string;
  value: string;
  icon: ReactNode;
  detail: ReactNode;
}) {
  return (
    <section className="metric-card">
      <div className="metric-label">
        {label}
        {icon}
      </div>
      <strong>{value}</strong>
      <div className="metric-detail">{detail}</div>
    </section>
  );
}
function BalanceChart({ data }: { data: Overview }) {
  const history = data.history.length
    ? data.history
    : [
        {
          timestamp: data.account.observed_at,
          balance: data.account.balance,
          reason: 'Current balance',
        },
      ];
  const values = history.map((p) => Number(p.balance));
  const reserve = Number(data.policy.minimum_reserve);
  const upper = Math.max(...values, reserve, 1) * 1.3;
  const w = 660,
    h = 155;
  const points = values.map((v, i) => [
    history.length === 1 ? 0 : (i / (history.length - 1)) * w,
    h - (v / upper) * h,
  ]);
  if (points.length === 1) points.push([w, points[0][1]]);
  const d = points.map((p, i) => `${i ? 'L' : 'M'}${p[0]},${p[1]}`).join(' ');
  const ry = h - (reserve / upper) * h;
  return (
    <div className="balance-chart">
      <svg
        viewBox={`0 0 ${w} ${h + 10}`}
        role="img"
        aria-label="Settlement balance from recorded sandbox activity"
      >
        <defs>
          <linearGradient id="balanceFill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#b4d5ff" stopOpacity=".65" />
            <stop offset="100%" stopColor="#f8faff" stopOpacity=".1" />
          </linearGradient>
        </defs>
        {[0.2, 0.5, 0.8].map((n) => (
          <line key={n} x1="0" x2={w} y1={h * n} y2={h * n} stroke="#f0f0f3" />
        ))}
        <path d={`${d} L${w},${h} L0,${h} Z`} fill="url(#balanceFill)" />
        <line x1="0" x2={w} y1={ry} y2={ry} stroke="#b4b7bd" strokeDasharray="5 5" />
        <path d={d} fill="none" stroke="#007aff" strokeWidth="2.5" strokeLinejoin="round" />
        <circle
          cx={w - 3}
          cy={points.at(-1)![1]}
          r="4"
          fill="#007aff"
          stroke="white"
          strokeWidth="2"
        />
      </svg>
      <div className="chart-axis">
        <span>{date(history[0].timestamp)}</span>
        <span>Now</span>
      </div>
    </div>
  );
}

function RequestsTable({
  data,
  select,
  openAll,
  full,
  create,
}: {
  data: Overview;
  select: (id: string) => void;
  openAll?: () => void;
  full?: boolean;
  create: () => void;
}) {
  const [tab, setTab] = useState('all'),
    [search, setSearch] = useState('');
  const filtered = data.requests.filter(
    (r) =>
      (tab === 'all' ||
        (tab === 'approval' && r.status === 'AWAITING_APPROVAL') ||
        (tab === 'transit' && inFlight(r.status)) ||
        (tab === 'complete' && ['RECONCILED', 'NO_FUNDING_REQUIRED'].includes(r.status)) ||
        (tab === 'attention' && r.status === 'ATTENTION_REQUIRED')) &&
      `${r.label} ${r.partner_batch_id}`.toLowerCase().includes(search.toLowerCase()),
  );
  const rows = full ? filtered : filtered.slice(0, 5);
  return (
    <section className="panel requests-panel">
      <div className="panel-heading">
        <div>
          <h2>
            Requests<span className="count-tag">{data.requests.length}</span>
          </h2>
        </div>
        {openAll && (
          <button className="text-button muted" onClick={openAll}>
            View all
            <ArrowUpRight size={15} />
          </button>
        )}
      </div>
      <div className="table-toolbar">
        <div className="tabs" aria-label="Filter funding requests">
          {[
            ['all', 'All'],
            ['approval', 'Approval'],
            ['transit', 'In transit'],
            ['complete', 'Completed'],
            ...(full ? [['attention', 'Needs attention']] : []),
          ].map(([id, label]) => (
            <button className={tab === id ? 'selected' : ''} key={id} onClick={() => setTab(id)}>
              {label}
              {id === 'approval' && data.metrics.approval_count > 0 && (
                <span>{data.metrics.approval_count}</span>
              )}
            </button>
          ))}
        </div>
        <label className="search-field">
          <Search size={15} />
          <input
            aria-label="Search funding requests"
            placeholder="Search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
      </div>
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Batch</th>
              <th>Amount</th>
              <th>Route</th>
              <th>Status</th>
              <th>Scheduled</th>
              <th aria-label="Actions" />
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td>
                  <button className="batch-cell" onClick={() => select(r.id)}>
                    <span className="batch-icon">
                      <FileText size={17} />
                    </span>
                    <span>
                      <strong>{r.label}</strong>
                      <small>{r.partner_batch_id}</small>
                    </span>
                  </button>
                </td>
                <td>
                  <strong className="table-money">
                    ${formatAmount(r.calculation.required_top_up)}
                  </strong>
                  <small>USDT0</small>
                </td>
                <td>
                  <span className="table-route">
                    EVM <ArrowRight size={12} /> Stellar
                  </span>
                </td>
                <td>
                  <Badge status={r.status} />
                  {r.payout_status === 'PAID' && (
                    <small className="green-text">Payout completed</small>
                  )}
                </td>
                <td>
                  <span className="table-date">{date(r.scheduled_at)}</span>
                </td>
                <td>
                  <button
                    className="icon-button"
                    aria-label={`Open ${r.label}`}
                    onClick={() => select(r.id)}
                  >
                    <ArrowUpRight size={17} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!rows.length && (
        <div className="empty-state">
          <FileText size={27} />
          <h3>{search || tab !== 'all' ? 'No matching requests' : 'No requests yet'}</h3>
          {!search && tab === 'all' && (
            <button className="button secondary" onClick={create}>
              <Plus size={16} />
              Create request
            </button>
          )}
        </div>
      )}
      <div className="table-footer">
        <span>
          Showing {rows.length} of {filtered.length} requests
        </span>
      </div>
    </section>
  );
}

function CreateModal({
  data,
  close,
  created,
}: {
  data: Overview;
  close: () => void;
  created: (r: FundingRequest) => Promise<void>;
}) {
  const [label, setLabel] = useState(''),
    [batch, setBatch] = useState(`batch-${Date.now().toString().slice(-8)}`),
    [value, setValue] = useState('18430'),
    [scenario, setScenario] = useState<Scenario>('success');
  const [schedule, setSchedule] = useState(() => {
    const d = new Date(Date.now() + 3_600_000);
    return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  });
  const [key] = useState(() => crypto.randomUUID()),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  let calculated: string | null = null;
  try {
    calculated = shortfall(
      value,
      data.policy.minimum_reserve,
      data.account.balance,
      data.metrics.allocated_balance,
    );
  } catch {
    /* Invalid input is shown by form validation. */
  }
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const input: CreateFunding = {
        label,
        partner_batch_id: batch,
        required_liquidity: value,
        scheduled_at: new Date(schedule).toISOString(),
        settlement_account_id: data.account.id,
        source_treasury_id: data.treasury.id,
        asset: data.account.asset,
        idempotency_key: key,
        scenario,
      };
      await created(await api<FundingRequest>('/funding-requests', input));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal title="New funding request" close={close}>
      <form onSubmit={submit}>
        <label className="field">
          Batch name
          <input
            autoFocus
            required
            maxLength={100}
            placeholder="September payroll"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
          />
        </label>
        <div className="form-grid">
          <label className="field">
            Partner batch ID
            <input required value={batch} onChange={(e) => setBatch(e.target.value)} />
          </label>
          <label className="field">
            Payout amount · USDT0
            <input
              required
              inputMode="decimal"
              pattern="[0-9]+(\.[0-9]{1,7})?"
              value={value}
              onChange={(e) => setValue(e.target.value)}
            />
          </label>
        </div>
        <label className="field">
          Scheduled payout time
          <input
            required
            type="datetime-local"
            value={schedule}
            onChange={(e) => setSchedule(e.target.value)}
          />
          <small>
            At least {data.policy.minimum_lead_time_minutes} minutes ahead · Your local time
          </small>
        </label>
        <div className="calculation-box">
          <div>
            <span>Payout need</span>
            <strong>${formatAmount(value || '0')}</strong>
          </div>
          <div>
            <span>Minimum reserve</span>
            <span>+ ${money(data.policy.minimum_reserve)}</span>
          </div>
          <div>
            <span>Allocated to other batches</span>
            <span>+ ${money(data.metrics.allocated_balance)}</span>
          </div>
          <div>
            <span>Settlement balance</span>
            <span>− ${money(data.account.balance)}</span>
          </div>
          <div className="calculation-total">
            <strong>Required funding</strong>
            <strong>{calculated === null ? '—' : `$${formatAmount(calculated)}`}</strong>
          </div>
        </div>
        <label className="field">
          Sandbox scenario
          <select value={scenario} onChange={(e) => setScenario(e.target.value as Scenario)}>
            <option value="success">Successful delivery</option>
            <option value="delayed">Delayed delivery — test recovery</option>
            <option value="mismatch">Amount mismatch — test reconciliation</option>
          </select>
        </label>
        {error && (
          <div role="alert" className="form-error">
            {error}
          </div>
        )}
        <div className="modal-actions">
          <button type="button" className="button secondary" onClick={close}>
            Cancel
          </button>
          <button className="button primary" disabled={busy || data.policy.paused}>
            {busy ? <LoaderCircle className="spin" size={16} /> : <Plus size={16} />}Create request
          </button>
        </div>
      </form>
    </Modal>
  );
}

function RequestModal({
  request: r,
  data,
  close,
  action,
  busy,
  notify,
}: {
  request: FundingRequest;
  data: Overview;
  close: () => void;
  action: (fn: () => Promise<unknown>, message: string) => Promise<void>;
  busy: boolean;
  notify: (text: string, error?: boolean) => void;
}) {
  const [events, setEvents] = useState<AuditEvent[]>([]),
    [accepted, setAccepted] = useState(false);
  useEffect(() => {
    void api<{ data: AuditEvent[] }>(`/funding-requests/${r.id}/events`)
      .then((v) => setEvents(v.data))
      .catch((e) => notify(e.message, true));
  }, [r.id, r.updated_at]);
  const call = (suffix: string, body: unknown = {}) =>
    api(`/funding-requests/${r.id}/${suffix}`, body);
  return (
    <Modal title="Funding request" close={close} wide>
      <div className="request-summary">
        <div className="request-summary-icon">
          <ArrowDownLeft size={27} />
        </div>
        <div>
          <h3>{r.label}</h3>
          <span>{r.partner_batch_id}</span>
        </div>
        <Badge status={r.status} />
      </div>
      <div className="detail-amount">
        <span>Required funding</span>
        <strong>
          ${formatAmount(r.calculation.required_top_up)}
          <small>USDT0</small>
        </strong>
        <span>
          For a ${formatAmount(r.required_liquidity)} payout · {date(r.scheduled_at)}
        </span>
      </div>
      {r.issue && (
        <div className="exception-box">
          <AlertTriangle size={19} />
          <div>
            <strong>Review required</strong>
            <p>{r.issue}</p>
          </div>
        </div>
      )}
      <div className="detail-grid">
        <div className="detail-card">
          <span>Source treasury</span>
          <strong>
            <Layers3 size={16} />
            EVM sandbox
          </strong>
          <code>{r.source.address}</code>
        </div>
        <div className="detail-card">
          <span>Destination account</span>
          <strong>
            <span className="stellar-glyph">≋</span>Stellar settlement
          </strong>
          <code>{r.destination.address}</code>
        </div>
      </div>
      <div className="detail-section">
        <h4>
          Funding calculation<span>Policy v{r.policy_snapshot.version}</span>
        </h4>
        <div className="detail-calculation">
          <div>
            <span>Payout need</span>
            <strong>${formatAmount(r.calculation.batch_need)}</strong>
          </div>
          <div>
            <span>Reserve</span>
            <strong>${formatAmount(r.calculation.minimum_reserve)}</strong>
          </div>
          <div>
            <span>Other allocations</span>
            <strong>${formatAmount(r.calculation.allocated_to_other_batches)}</strong>
          </div>
          <div>
            <span>Balance at creation</span>
            <strong>${formatAmount(r.calculation.available_balance)}</strong>
          </div>
        </div>
      </div>
      <div className="detail-section">
        <h4>
          Funding timeline<span>{r.mode}</span>
        </h4>
        <div className="timeline">
          {events.map((e) => (
            <div className="timeline-item" key={e.id}>
              <span className="timeline-dot">
                <Check size={11} />
              </span>
              <div>
                <strong>{friendly(e.action)}</strong>
                <small>{e.actor}</small>
              </div>
              <time>{date(e.timestamp)}</time>
            </div>
          ))}
        </div>
      </div>
      {r.evidence && (
        <div className="detail-section">
          <h4>
            Transfer evidence<span>Simulated identifiers</span>
          </h4>
          <div className="evidence-list">
            {[
              ['Source transaction', r.evidence.source_tx_hash],
              ['Transport message', r.evidence.message_id],
              ['Stellar receipt', r.evidence.destination_tx_hash],
              [
                'Observed amount',
                r.evidence.observed_amount ? `${r.evidence.observed_amount} USDT0` : undefined,
              ],
            ].map(([label, value]) => (
              <div key={label}>
                <span>{label}</span>
                <code>{value || 'Awaiting observation'}</code>
              </div>
            ))}
          </div>
        </div>
      )}
      <div className="intent-hash">
        <LockKeyhole size={13} />
        <span>Intent</span>
        <code>{r.intent_hash.slice(0, 24)}…</code>
        <button
          className="icon-button"
          aria-label="Copy intent hash"
          onClick={() =>
            void navigator.clipboard
              .writeText(r.intent_hash)
              .then(() => notify('Intent hash copied.'))
              .catch(() => notify('Clipboard unavailable.', true))
          }
        >
          <Copy size={13} />
        </button>
      </div>
      {r.status === 'AWAITING_APPROVAL' && (
        <label className="approval-check">
          <input
            type="checkbox"
            checked={accepted}
            onChange={(e) => setAccepted(e.target.checked)}
          />
          <span>
            I reviewed the <strong>${formatAmount(r.calculation.required_top_up)} USDT0</strong>{' '}
            amount and destination. I approve this sandbox transfer.
          </span>
        </label>
      )}
      {r.payout_status === 'PAID' && (
        <div className="success-note">
          <CheckCheck size={18} />
          Sandbox payout completed. Funds and batch are reconciled.
        </div>
      )}
      <div className="modal-actions detail-actions">
        <a
          className="button secondary"
          href={`/api/v1/funding-requests/${r.id}/evidence`}
          download
          onClick={(e) => {
            e.preventDefault();
            void api(`/funding-requests/${r.id}/evidence`)
              .then((evidence) => download(evidence, `${r.id}-evidence.json`))
              .catch((error) => notify(error.message, true));
          }}
        >
          <Download size={16} />
          Export evidence
        </a>
        <div>
          {!r.submitted_at &&
            !['CANCELLED', 'EXPIRED'].includes(r.status) &&
            r.payout_status !== 'PAID' && (
              <button
                className="button ghost"
                disabled={busy}
                onClick={() =>
                  void action(() => call('cancel'), 'Request cancelled. No transfer was sent.')
                }
              >
                Cancel request
              </button>
            )}
          {r.status === 'AWAITING_APPROVAL' && (
            <button
              className="button primary"
              disabled={busy || !accepted || data.policy.paused}
              onClick={() =>
                void action(
                  () => call('approve', { intent_hash: r.intent_hash }),
                  'Funding intent approved.',
                )
              }
            >
              <ShieldCheck size={16} />
              Approve funding
            </button>
          )}
          {r.status === 'APPROVED' && (
            <button
              className="button primary"
              disabled={busy || data.policy.paused}
              onClick={() =>
                void action(() => call('submit'), 'Sandbox transfer submitted. Tracking delivery.')
              }
            >
              <Play size={15} />
              Run sandbox transfer
            </button>
          )}
          {inFlight(r.status) && (
            <span className="tracking-label">
              <LoaderCircle size={16} className="spin" />
              Tracking delivery
            </span>
          )}
          {r.status === 'ATTENTION_REQUIRED' && (
            <button
              className="button secondary"
              disabled={busy}
              onClick={() =>
                void action(
                  () => call('retry-observation'),
                  'Observation refreshed. No additional funds were sent.',
                )
              }
            >
              <RefreshCw size={15} />
              Retry observation
            </button>
          )}
          {r.status === 'ATTENTION_REQUIRED' && r.scenario === 'delayed' && (
            <button
              className="button primary"
              disabled={busy}
              onClick={() =>
                void action(
                  () => api(`/sandbox/${r.id}/release-delay`, {}),
                  'Delayed sandbox delivery released and reconciled.',
                )
              }
            >
              Release sandbox delay
            </button>
          )}
          {r.payout_status === 'READY' && (
            <button
              className="button primary"
              disabled={busy}
              onClick={() =>
                void action(() => api(`/sandbox/${r.id}/payout`, {}), 'Sandbox payout completed.')
              }
            >
              <CheckCheck size={16} />
              Simulate payout
            </button>
          )}
        </div>
      </div>
    </Modal>
  );
}

function PolicyPage({
  data,
  action,
  busy,
}: {
  data: Overview;
  action: (fn: () => Promise<unknown>, message: string) => Promise<void>;
  busy: boolean;
}) {
  const [form, setForm] = useState(() => {
    const { version: _v, paused: _p, ...fields } = data.policy;
    return fields;
  });
  const fields: {
    key: keyof typeof form;
    label: string;
    description: string;
    numeric?: boolean;
  }[] = [
    {
      key: 'minimum_reserve',
      label: 'Minimum operating reserve',
      description: 'Retained after payouts.',
    },
    {
      key: 'max_single_funding',
      label: 'Maximum single funding',
      description: 'Per-transfer limit.',
    },
    {
      key: 'daily_funding_cap',
      label: 'Daily funding cap',
      description: 'UTC day · Includes reservations.',
    },
    {
      key: 'request_expiry_minutes',
      label: 'Request expiry · minutes',
      description: 'For unsubmitted requests.',
      numeric: true,
    },
    {
      key: 'minimum_lead_time_minutes',
      label: 'Minimum funding lead time · minutes',
      description: 'Before scheduled payout.',
      numeric: true,
    },
    {
      key: 'delivery_timeout_seconds',
      label: 'Sandbox delivery timeout · seconds',
      description: 'Flags delayed delivery.',
      numeric: true,
    },
  ];
  return (
    <div className="settings-layout">
      <section className="panel settings-panel">
        <div className="panel-heading">
          <div>
            <h2>
              Funding policy<span className="subtle-tag">Version {data.policy.version}</span>
            </h2>
            <p>Applies to new requests.</p>
          </div>
          <ShieldCheck size={22} />
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void action(() => api('/policy', form, 'PUT'), 'Treasury policy updated and recorded.');
          }}
        >
          <div className="policy-fields">
            {fields.map((f) => (
              <label className="field" key={f.key}>
                {f.label}
                <div className="input-with-unit">
                  <input
                    type={f.numeric ? 'number' : 'text'}
                    inputMode="decimal"
                    required
                    min={f.key === 'minimum_lead_time_minutes' ? 0 : 1}
                    value={form[f.key]}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        [f.key]: f.numeric ? Number(e.target.value) : e.target.value,
                      })
                    }
                  />
                  <span>{f.numeric ? (f.key.includes('seconds') ? 'SEC' : 'MIN') : 'USDT0'}</span>
                </div>
                <small>{f.description}</small>
              </label>
            ))}
          </div>
          <div className="settings-footer">
            <button className="button primary" disabled={busy}>
              Save policy
            </button>
          </div>
        </form>
      </section>
      <div className="settings-aside">
        <section className="panel pause-card">
          <div>
            <Pause size={19} />
            <h3>Emergency pause</h3>
          </div>
          <p>Pauses new funding. Transfers in progress continue.</p>
          <button
            className={`button ${data.policy.paused ? 'primary' : 'secondary'}`}
            disabled={busy}
            onClick={() =>
              void action(
                () => api('/pause', { paused: !data.policy.paused }),
                data.policy.paused ? 'Funding resumed.' : 'New funding paused.',
              )
            }
          >
            {data.policy.paused ? <Play size={15} /> : <Pause size={15} />}
            {data.policy.paused ? 'Resume funding' : 'Pause funding'}
          </button>
        </section>
      </div>
    </div>
  );
}
function AuditPage({
  events: initial,
  notify,
}: {
  events: AuditEvent[];
  notify: (s: string, e?: boolean) => void;
}) {
  const [events, setEvents] = useState(initial),
    [query, setQuery] = useState('');
  useEffect(() => {
    void api<{ data: AuditEvent[] }>('/audit-events')
      .then((r) => setEvents(r.data))
      .catch((e) => notify(e.message, true));
  }, [initial]);
  const filtered = events.filter((e) =>
    `${e.action} ${e.actor} ${e.request_id}`.toLowerCase().includes(query.toLowerCase()),
  );
  return (
    <section className="panel">
      <div className="panel-heading">
        <div>
          <h2>
            Audit trail<span className="count-tag">{events.length}</span>
          </h2>
        </div>
        <button
          className="button secondary"
          onClick={() => download(events, 'flux-sandbox-audit.json')}
        >
          <Download size={15} />
          Export audit
        </button>
      </div>
      <div className="audit-search">
        <label className="search-field">
          <Search size={16} />
          <input
            aria-label="Search audit events"
            placeholder="Search events"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
      </div>
      <div className="table-scroll">
        <table className="audit-table">
          <thead>
            <tr>
              <th>Event</th>
              <th>Actor</th>
              <th>Timestamp</th>
              <th>Record hash</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((e) => (
              <tr key={e.id}>
                <td>
                  <strong>{friendly(e.action)}</strong>
                  <small>
                    {e.request_id ? e.request_id.slice(0, 20) + '…' : 'Workspace event'}
                  </small>
                </td>
                <td>{e.actor}</td>
                <td>{date(e.timestamp)}</td>
                <td>
                  <code>{e.hash.slice(0, 16)}…</code>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!filtered.length && (
        <div className="empty-state">
          <Search size={25} />
          <h3>No matching events</h3>
        </div>
      )}
    </section>
  );
}
function IntegrationsPage({ notify }: { notify: (s: string, e?: boolean) => void }) {
  const [data, setData] = useState<{ webhook_configured: boolean; events: OutboxEvent[] } | null>(
    null,
  );
  useEffect(() => {
    void api<{ webhook_configured: boolean; events: OutboxEvent[] }>('/integrations')
      .then(setData)
      .catch((e) => notify(e.message, true));
  }, []);
  const snippet = `const flux = new FluxClient({\n  baseUrl: "http://127.0.0.1:4337",\n  token: process.env.FLUX_API_TOKEN\n});\n\nawait flux.createFundingRequest({\n  partner_batch_id: "payroll-sep-002",\n  label: "September payroll",\n  required_liquidity: "18430.00",\n  scheduled_at: new Date(Date.now() + 3600000).toISOString(),\n  settlement_account_id: "stellar_ops_01",\n  source_treasury_id: "evm_treasury_01",\n  asset: "USDT0",\n  idempotency_key: "payroll-sep-002-v1"\n});`;
  return (
    <>
      <div className="integration-grid">
        <section className="panel integration-card">
          <span className="integration-icon">
            <Code2 size={24} />
          </span>
          <div className="integration-title">
            <h2>Partner API</h2>
            <span className="badge status-reconciled">
              <span />
              Available locally
            </span>
          </div>
          <div className="endpoint">
            <span>BASE URL</span>
            <code>/api/v1</code>
          </div>
          <div className="inline-note">
            <LockKeyhole size={16} />
            <span>Bearer token · Operator approval</span>
          </div>
        </section>
        <section className="panel integration-card">
          <span className="integration-icon">
            <Zap size={24} />
          </span>
          <div className="integration-title">
            <h2>Status webhooks</h2>
            <span className="small-tag">
              {data?.webhook_configured ? 'Configured' : 'Not configured'}
            </span>
          </div>
          <div className="endpoint">
            <span>Delivery</span>
            <code>At least once · HMAC-SHA256</code>
          </div>
          <div className="inline-note">
            <Activity size={16} />
            <span>{data?.events.filter((e) => !e.delivered_at).length ?? 0} pending events</span>
          </div>
        </section>
      </div>
      <div className="integration-bottom">
        <section className="code-panel">
          <div>
            <span>
              <Code2 size={17} />
              Create a request
            </span>
            <button
              className="icon-button"
              aria-label="Copy integration example"
              onClick={() =>
                void navigator.clipboard
                  .writeText(snippet)
                  .then(() => notify('Integration example copied.'))
                  .catch(() => notify('Clipboard unavailable.', true))
              }
            >
              <Copy size={16} />
            </button>
          </div>
          <pre>
            <code>{snippet}</code>
          </pre>
          <footer>TypeScript · src/sdk/client.ts</footer>
        </section>
      </div>
      <section className="panel">
        <div className="panel-heading">
          <div>
            <h2>Webhook outbox</h2>
          </div>
          <button
            className="button secondary"
            onClick={() =>
              void api<{ webhook_configured: boolean; events: OutboxEvent[] }>('/integrations')
                .then(setData)
                .catch((e) => notify(e.message, true))
            }
          >
            <RefreshCw size={15} />
            Refresh
          </button>
        </div>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Event</th>
                <th>Created</th>
                <th>Attempts</th>
                <th>Delivery</th>
              </tr>
            </thead>
            <tbody>
              {data?.events.slice(0, 12).map((e) => (
                <tr key={e.id}>
                  <td>
                    <strong>{e.event_type}</strong>
                    <small>{e.id.slice(0, 22)}…</small>
                  </td>
                  <td>{date(e.created_at)}</td>
                  <td>{e.attempts}</td>
                  <td>
                    {e.delivered_at
                      ? 'Delivered'
                      : data.webhook_configured
                        ? 'Pending / retrying'
                        : 'Awaiting endpoint'}
                    {e.last_error && <small>{e.last_error}</small>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!data?.events.length && (
          <div className="empty-state">
            <Zap size={24} />
            <h3>No events yet</h3>
          </div>
        )}
      </section>
    </>
  );
}
