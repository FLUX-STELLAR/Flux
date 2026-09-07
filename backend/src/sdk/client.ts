import type { CreateFunding, FundingRequest } from '../../../shared/types.js';

export class FluxClient {
  constructor(private options: { baseUrl: string; token: string }) {}
  private async request<T>(path: string, body?: unknown): Promise<T> {
    const response = await fetch(`${this.options.baseUrl.replace(/\/$/, '')}/api/v1${path}`, {
      method: body === undefined ? 'GET' : 'POST',
      headers: {
        Authorization: `Bearer ${this.options.token}`,
        'Content-Type': 'application/json',
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(15_000),
    });
    const data = await response.json();
    if (!response.ok)
      throw new Error(
        `${data.error?.code ?? response.status}: ${data.error?.message ?? 'Flux request failed'}`,
      );
    return data as T;
  }
  createFundingRequest(input: CreateFunding) {
    return this.request<FundingRequest>('/funding-requests', input);
  }
  getFundingRequest(id: string) {
    return this.request<FundingRequest>(`/funding-requests/${encodeURIComponent(id)}`);
  }
  retryObservation(id: string) {
    return this.request<FundingRequest>(
      `/funding-requests/${encodeURIComponent(id)}/retry-observation`,
      {},
    );
  }
}
