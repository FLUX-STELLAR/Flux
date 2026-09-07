import express, { type NextFunction, type Request, type Response } from 'express';
import { timingSafeEqual } from 'node:crypto';
import { ZodError, z } from 'zod';
import { AppError, FundingService } from './service.js';

function equals(a: string, b: string) {
  return (
    Buffer.byteLength(a) === Buffer.byteLength(b) && timingSafeEqual(Buffer.from(a), Buffer.from(b))
  );
}
export function createApp(
  service: FundingService,
  options: { token: string; sessionToken: string; webhookConfigured?: boolean },
) {
  const app = express();
  app.disable('x-powered-by');
  app.use((req, res, next) => {
    const host = req.headers.host ?? '';
    // The shipped sandbox only serves loopback. This also rejects DNS rebinding.
    if (!/^(127\.0\.0\.1|localhost)(:\d+)?$/.test(host))
      return res.status(403).json({
        error: {
          code: 'INVALID_HOST',
          message: 'This workspace is only available on localhost.',
        },
      });
    if (
      req.headers.origin &&
      req.headers.origin !== `http://${host}` &&
      req.headers.origin !== `https://${host}`
    )
      return res.status(403).json({
        error: { code: 'CROSS_ORIGIN', message: 'Cross-origin access is not permitted.' },
      });
    res.setHeader('X-Content-Type-Options', 'nosniff');
    // The local sandbox is previewed inside editor webviews. Permit trusted
    // local/editor parents without allowing arbitrary remote sites to frame it.
    res.setHeader(
      'Content-Security-Policy',
      "frame-ancestors 'self' http://127.0.0.1:* http://localhost:* vscode-webview: vscode-file: https://*.vscode-cdn.net",
    );
    res.setHeader('Referrer-Policy', 'no-referrer');
    next();
  });
  app.use(express.json({ limit: '64kb' }));
  app.get('/health', (_req, res) => res.json({ status: 'ok', mode: 'sandbox', service: 'flux' }));
  app.post('/api/session', (req, res) => {
    if (!req.is('application/json'))
      return res
        .status(415)
        .json({ error: { code: 'JSON_REQUIRED', message: 'Send application/json.' } });
    res.setHeader(
      'Set-Cookie',
      `flux_session=${options.sessionToken}; HttpOnly; SameSite=Strict; Path=/; Max-Age=43200`,
    );
    res.setHeader('Cache-Control', 'no-store');
    // In-memory session transport also works when embedded previews block cookies.
    // The same loopback, origin and JSON checks protect this bootstrap.
    res.json({ actor: 'operator:local', mode: 'sandbox', session_token: options.sessionToken });
  });
  app.use('/api', (req, res, next) => {
    const bearer = req.headers.authorization?.replace(/^Bearer /, '') ?? '';
    const cookie =
      req.headers.cookie
        ?.split(';')
        .map((s) => s.trim())
        .find((s) => s.startsWith('flux_session='))
        ?.slice(13) ?? '';
    const sessionHeader = req.get('X-Flux-Session') ?? '';
    const validPartner = Boolean(bearer && equals(bearer, options.token));
    const validOperator = Boolean(
      (cookie && equals(cookie, options.sessionToken)) ||
      (sessionHeader && equals(sessionHeader, options.sessionToken)),
    );
    if (!validPartner && !validOperator)
      return res.status(401).json({
        error: { code: 'UNAUTHORIZED', message: 'A local session or API token is required.' },
      });
    if (!['GET', 'HEAD'].includes(req.method) && !req.is('application/json'))
      return res
        .status(415)
        .json({ error: { code: 'JSON_REQUIRED', message: 'Send application/json.' } });
    res.locals.actor = validPartner ? 'partner:api' : 'operator:local';
    res.setHeader('Cache-Control', 'no-store');
    next();
  });
  const operator = (_req: Request, res: Response, next: NextFunction) => {
    if (res.locals.actor !== 'operator:local')
      return res.status(403).json({
        error: {
          code: 'OPERATOR_REQUIRED',
          message: 'This action requires an operator session.',
        },
      });
    next();
  };
  const base = '/api/v1';
  app.get(`${base}/overview`, (_req, res) => res.json(service.overview()));
  app.get(`${base}/funding-requests`, (_req, res) => res.json({ data: service.store.requests() }));
  app.post(`${base}/funding-requests`, (req, res) =>
    res.status(201).json(service.create(req.body, res.locals.actor)),
  );
  app.post(`${base}/integrations/:partner/events`, (req, res) =>
    res.status(201).json(service.create(req.body, `partner:${req.params.partner}`)),
  );
  app.get(`${base}/funding-requests/:id`, (req, res) => res.json(service.require(req.params.id)));
  app.get(`${base}/funding-requests/:id/evidence`, (req, res) => {
    const r = service.require(req.params.id);
    res.setHeader('Content-Disposition', `attachment; filename="${r.id}-evidence.json"`);
    res.json({
      mode: 'sandbox',
      exported_at: service.now(),
      funding_request: r,
      audit_events: service.store.requestEvents(r.id),
    });
  });
  app.get(`${base}/funding-requests/:id/events`, (req, res) => {
    service.require(req.params.id);
    res.json({ data: service.store.requestEvents(req.params.id) });
  });
  app.post(`${base}/funding-requests/:id/approve`, operator, (req, res) =>
    res.json(
      service.approve(
        req.params.id as string,
        z.object({ intent_hash: z.string().length(64) }).parse(req.body).intent_hash,
        res.locals.actor,
      ),
    ),
  );
  app.post(`${base}/funding-requests/:id/submit`, operator, (req, res) =>
    res.json(service.submit(req.params.id as string, res.locals.actor)),
  );
  app.post(`${base}/funding-requests/:id/cancel`, operator, (req, res) =>
    res.json(service.cancel(req.params.id as string, res.locals.actor)),
  );
  app.post(`${base}/funding-requests/:id/retry-observation`, (req, res) =>
    res.json(service.retryObservation(req.params.id as string, res.locals.actor)),
  );
  app.post(`${base}/sandbox/:id/release-delay`, operator, (req, res) =>
    res.json(service.resolveSandboxDelay(req.params.id as string, res.locals.actor)),
  );
  app.post(`${base}/sandbox/:id/payout`, operator, (req, res) =>
    res.json(service.payout(req.params.id as string)),
  );
  app.get(`${base}/policy`, (_req, res) => res.json(service.policy()));
  app.put(`${base}/policy`, operator, (req, res) =>
    res.json(service.updatePolicy(req.body, res.locals.actor)),
  );
  app.post(`${base}/pause`, operator, (req, res) =>
    res.json(
      service.pause(z.object({ paused: z.boolean() }).parse(req.body).paused, res.locals.actor),
    ),
  );
  app.get(`${base}/settlement-accounts/:id/balance`, (req, res) => {
    if (req.params.id !== service.account().id)
      throw new AppError('NOT_FOUND', 'Settlement account not found.', 404);
    res.json(service.account());
  });
  app.get(`${base}/operators/:id/metrics`, (req, res) => {
    if (req.params.id !== 'operator_01')
      throw new AppError('NOT_FOUND', 'Operator not found.', 404);
    res.json(service.overview().metrics);
  });
  app.get(`${base}/audit-events`, (_req, res) => res.json({ data: service.store.events(500) }));
  app.get(`${base}/integrations`, (_req, res) =>
    res.json({
      webhook_configured: Boolean(options.webhookConfigured),
      events: service.store.outbox().slice(0, 50),
      api_base: '/api/v1',
      mode: 'sandbox',
    }),
  );
  app.use('/api', (_req, res) =>
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'API route not found.' } }),
  );
  app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
    if (error instanceof ZodError)
      return res.status(422).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; '),
        },
      });
    if (error instanceof AppError)
      return res.status(error.status).json({ error: { code: error.code, message: error.message } });
    if (error instanceof SyntaxError)
      return res
        .status(400)
        .json({ error: { code: 'INVALID_JSON', message: 'Invalid JSON body.' } });
    console.error('Request failed:', error instanceof Error ? error.message : 'Unknown error');
    return res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Request failed safely. No action should be assumed complete; refresh its status.',
      },
    });
  });
  return app;
}
