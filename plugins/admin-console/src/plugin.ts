import {
  createPlugin,
  createRoutableExtension,
} from '@backstage/core-plugin-api';

import { rootRouteRef } from './routes';

export const adminConsolePlugin = createPlugin({
  id: 'admin-console',
  routes: {
    root: rootRouteRef,
  },
});

export const AdminConsolePage = adminConsolePlugin.provide(
  createRoutableExtension({
    name: 'AdminConsolePage',
    component: () =>
      import('./components/Router').then(m => m.Router),
    mountPoint: rootRouteRef,
  }),
);
