import type { Store } from './store.js';
import { signWebhook } from './sdk/webhooks.js';

export class WebhookDispatcher {
  private running = false;
  constructor(
    private store: Store,
    private secret: string,
    private url?: string,
  ) {
    if (url && new URL(url).protocol !== 'https:')
      throw new Error('FLUX_WEBHOOK_URL must use HTTPS.');
  }
  async tick() {
    if (!this.url || this.running) return;
    this.running = true;
    try {
      // Delivery order is stable; receivers must still tolerate retries and deduplicate event_id.
      const queue = this.store
        .outbox()
        .reverse()
        .filter((e) => !e.delivered_at && Date.parse(e.next_attempt_at) <= Date.now())
        .slice(0, 5);
      for (const event of queue) {
        const body = JSON.stringify(event.payload),
          timestamp = Math.floor(Date.now() / 1000).toString();
        event.attempts++;
        try {
          const response = await fetch(this.url, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Flux-Timestamp': timestamp,
              'X-Flux-Signature': signWebhook(body, timestamp, this.secret),
              'X-Flux-Event-Id': event.id,
            },
            body,
            redirect: 'error',
            signal: AbortSignal.timeout(5000),
          });
          await response.body?.cancel();
          if (!response.ok) throw new Error(`HTTP ${response.status}`);
          event.delivered_at = new Date().toISOString();
          event.last_error = null;
        } catch (error) {
          event.last_error = error instanceof Error ? error.message : 'Delivery failed';
          event.next_attempt_at = new Date(
            Date.now() + Math.min(3600, 2 ** Math.min(event.attempts, 12)) * 1000,
          ).toISOString();
        }
        this.store.saveOutbox(event);
      }
    } finally {
      this.running = false;
    }
  }
}
