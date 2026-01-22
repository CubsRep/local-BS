import {
	coreServices,
	createBackendPlugin,
} from '@backstage/backend-plugin-api';
import { createRouter } from './services/router';
import { DatabricksClient } from './services/DatabricksApiClient';

/**
 * databricksPlugin backend plugin
 * 
 * @public
 */
export const databricksPlugin = createBackendPlugin({
  pluginId: 'databricks',
  register(env) {
    env.registerInit({
      deps: {
        logger: coreServices.logger,
        httpRouter: coreServices.httpRouter,
        config: coreServices.rootConfig,
      },
      async init({ logger, httpRouter, config }) {
        const databricksClient = DatabricksClient.fromConfig({
          config,
          logger,
        });
        httpRouter.use(
          await createRouter({
            logger,
            databricksClient,
          }),
        );
      },
    });
  },
});
 
