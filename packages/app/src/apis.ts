import {
  ScmIntegrationsApi,
  scmIntegrationsApiRef,
  ScmAuth,
} from '@backstage/integration-react';
import {
  AnyApiFactory,
  configApiRef,
  createApiFactory,
  fetchApiRef,
  discoveryApiRef,
} from '@backstage/core-plugin-api';

import { drnViewerApiRef, DrnViewerClient } from '@internal/plugin-drn-viewer';

export const apis: AnyApiFactory[] = [
  // 1) SCM integrations from app-config.yaml
  createApiFactory({
    api: scmIntegrationsApiRef,
    deps: { configApi: configApiRef },
    factory: ({ configApi }) => ScmIntegrationsApi.fromConfig(configApi),
  }),
  // 2) Custom Drn Viewer Client
  createApiFactory({
    api: drnViewerApiRef,
    deps: { discoveryApi: discoveryApiRef, fetchApi: fetchApiRef },
    factory: ({ discoveryApi, fetchApi }) =>
      new DrnViewerClient(discoveryApi, fetchApi),
  }),

  ScmAuth.createDefaultApiFactory(),
];
