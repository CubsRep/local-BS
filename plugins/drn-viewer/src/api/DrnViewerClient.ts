import { DiscoveryApi, FetchApi } from '@backstage/core-plugin-api';
import {
  DrnViewerApi,
  ListPendingParams,
  ListPendingResponse,
} from './DrnViewerApi';

export class DrnViewerClient implements DrnViewerApi {
  constructor(
    private readonly discoveryApi: DiscoveryApi,
    private readonly fetchApi: FetchApi,
  ) {}

  async listPending(params: ListPendingParams): Promise<ListPendingResponse> {
    const baseUrl = await this.discoveryApi.getBaseUrl('drn-viewer');
    const resp = await this.fetchApi.fetch(
      `${baseUrl}/pending?includeApproved=${params.includeApproved}`,
    );
    if (!resp.ok) throw new Error(`Failed to fetch DRNs: ${resp.status}`);
    return (await resp.json()) as ListPendingResponse;
  }

  async decide(drn: string, decision: 'approve' | 'reject'): Promise<void> {
    const baseUrl = await this.discoveryApi.getBaseUrl('drn-viewer');
    const resp = await this.fetchApi.fetch(`${baseUrl}/decision`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ drn, decision }),
    });
    if (!resp.ok) throw new Error(`Failed decision submit: ${resp.status}`);
  }
}
