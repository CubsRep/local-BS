import { createDevApp } from '@backstage/dev-utils';
import { adminConsolePlugin, AdminConsolePage } from '../src/plugin';

createDevApp()
  .registerPlugin(adminConsolePlugin)
  .addPage({
    element: <AdminConsolePage />,
    title: 'Root Page',
    path: '/admin-console',
  })
  .render();
