import { createHmac, timingSafeEqual } from 'node:crypto';

export function signWebhook(body: string, timestamp: string, secret: string) {
  return createHmac('sha256', secret).update(`${timestamp}.${body}`).digest('hex');
}
export function verifyWebhook(
  body: string,
  timestamp: string,
  signature: string,
  secret: string,
  now = Date.now(),
) {
  if (!/^\d{10}$/.test(timestamp) || !/^[a-f0-9]{64}$/.test(signature)) return false;
  if (Math.abs(now - Number(timestamp) * 1000) > 300_000) return false;
  return timingSafeEqual(
    Buffer.from(signWebhook(body, timestamp, secret), 'hex'),
    Buffer.from(signature, 'hex'),
  );
}
