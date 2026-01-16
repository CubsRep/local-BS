import {
  coreServices,
  createBackendPlugin,
} from '@backstage/backend-plugin-api';
import { createRouter } from './router';

export const drnViewerBackendPlugin = createBackendPlugin({
  pluginId: 'drn-viewer',
  register(env) {
    env.registerInit({
      deps: {
        logger: coreServices.logger,
        httpRouter: coreServices.httpRouter,
      },
      async init({ logger, httpRouter }) {
        httpRouter.use(
          await createRouter({
            logger,
          }),
        );
      },
    });
  },
});
