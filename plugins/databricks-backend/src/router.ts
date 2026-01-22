import express from 'express';
import Router from 'express-promise-router';
import { DatabricksClient } from './services/DatabricksClient';
import { LoggerService } from '@backstage/backend-plugin-api';


export type DatabricksRouterOptions = {
    databricksClient: DatabricksClient;
    logger: LoggerService;
};

export async function createRouter(
    options: DatabricksRouterOptions,
): Promise<express.Router> {
    const { databricksClient, logger } = options;

    const router = Router();
    router.use(express.json());

    // GET /ws-validate
    router.get('/ws-validate/:name?', async (req, res) => {
        const name = String(req.params.name ?? '').trim();
        if (!name) return res.status(400).json({ error: 'name is required' });

        try {
            const available = await databricksClient.isWorkspaceNameAvailable(name);
            if (!available) {
                return res.status(400).json({ error: 'Workspace name already exists' });
            }
            return res.json({ available });
        } catch (e: any) {
            logger.error(`Failed to validate workspace name "${name}"`, e);
            return res.status(500).json({ error: e?.message ?? 'Workspace name validation failed' });
        }
    });

    /*
     * For testing purposes only.
     */
    router.get('/workspaces', async (_, res) => {
        try {
            const names = await databricksClient.listWorkspaceNamesCached();
            return res.json({ names });
        } catch (e: any) {
            logger.error(`Failed to list workspace names`, e);
            return res.status(500).json({ error: e?.message ?? 'Failed to list workspace names' });
        }
    });

    return router;
}
