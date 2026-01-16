import {
  createPlugin,
  createRoutableExtension,
} from '@backstage/core-plugin-api';

import { drnReviewRouteRef } from './routes';

export const drnViewerPlugin = createPlugin({
  id: 'drn-viewer',
  routes: {
    root: drnReviewRouteRef,
  },
});

export const DrnReviewPageExtension = drnViewerPlugin.provide(
  createRoutableExtension({
    name: 'DrnViewerPage',
    component: () =>
      import('./components/DrnReviewPage/DrnViewerPage').then(m => m.DrnReviewPage),
    mountPoint: drnReviewRouteRef,
  }),
);
