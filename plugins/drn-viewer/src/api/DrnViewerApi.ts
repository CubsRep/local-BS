import { Drn } from './types';
import { createApiRef } from '@backstage/core-plugin-api';

export type ListPendingParams = { includeApproved: boolean };
export type ListPendingResponse = { documents: Drn[] };

export type DrnViewerApi = {
  listPending: (params: ListPendingParams) => Promise<ListPendingResponse>;
  decide: (drn: string, decision: 'approve' | 'reject') => Promise<void>;
};

export const drnViewerApiRef = createApiRef<DrnViewerApi>({
  id: 'plugin.drn-viewer.service',
});
