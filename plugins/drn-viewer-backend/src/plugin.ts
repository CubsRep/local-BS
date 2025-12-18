import {
  coreServices,
  createBackendPlugin,
} from '@backstage/backend-plugin-api';
import { createRouter } from './router';
import { todoListServiceRef } from './services/TodoListService';

/**
 * drnViewerPlugin backend plugin
 *
 * @public
 */
export const drnViewerPlugin = createBackendPlugin({
  pluginId: 'drn-viewer',
  register(env) {
    env.registerInit({
      deps: {
        logger: coreServices.logger,
        httpAuth: coreServices.httpAuth,
        httpRouter: coreServices.httpRouter,
        todoList: todoListServiceRef,
      },
      async init({ logger, httpAuth, httpRouter, todoList }) {
        httpRouter.use(
          await createRouter({
            logger,
            httpAuth,
            todoList,
          }),
        );
      },
    });
  },
});
