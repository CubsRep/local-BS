import { createDevApp } from '@backstage/dev-utils';
import { drnViewerPlugin, DrnViewerPage } from '../src/plugin';

createDevApp()
  .registerPlugin(drnViewerPlugin)
  .addPage({
    element: <DrnViewerPage />,
    title: 'Root Page',
    path: '/drn-viewer',
  })
  .render();
