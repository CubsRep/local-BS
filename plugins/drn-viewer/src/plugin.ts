import {
  createPlugin,
  createRoutableExtension,
} from '@backstage/core-plugin-api';

import { rootRouteRef } from './routes';

export const drnViewerPlugin = createPlugin({
  id: 'drn-viewer',
  routes: {
    root: rootRouteRef,
  },
});

export const DrnViewerPage = drnViewerPlugin.provide(
  createRoutableExtension({
    name: 'DrnViewerPage',
    component: () =>
      import('./components/DrnViewerPage').then(m => m.DrnViewerPage),
    mountPoint: rootRouteRef,
  }),
);
