import express from 'express';
import request from 'supertest';
import { getVoidLogger } from '@backstage/backend-common';
import { createRouter, DatabricksRouterOptions } from './router';
import { DatabricksClient } from './services/DatabricksClient';

describe('createRouter', () => {
  let app: express.Express;
  let databricksClient: jest.Mocked<DatabricksClient>;
  let logger: ReturnType<typeof getVoidLogger>;

  beforeEach(async () => {
    databricksClient = ({
      isWorkspaceNameAvailable: jest.fn(),
      listWorkspaceNamesCached: jest.fn(),
      getAccessToken: jest.fn(), // Mock this as well, even if not directly called by router, it's a dependency of other methods
    } as unknown) as jest.Mocked<DatabricksClient>;
    logger = getVoidLogger();

    const options: DatabricksRouterOptions = {
      databricksClient,
      logger,
    };

    const router = await createRouter(options);
    app = express();
    app.use(router);
  });

  describe('GET /ws-validate/:name', () => {
    it('should return 400 if name is empty', async () => {
      const response = await request(app).get('/ws-validate/');
      expect(response.status).toEqual(400);
      expect(response.body).toEqual({ error: 'name is required' });
      expect(databricksClient.isWorkspaceNameAvailable).not.toHaveBeenCalled();
    });

    it('should return available: true for a valid and available name', async () => {
      databricksClient.isWorkspaceNameAvailable.mockResolvedValue(true);
      const response = await request(app).get('/ws-validate/new-workspace');
      expect(response.status).toEqual(200);
      expect(response.body).toEqual({ available: true });
      expect(databricksClient.isWorkspaceNameAvailable).toHaveBeenCalledWith('new-workspace');
    });

    it('should return available: false for a valid but unavailable name', async () => {
      databricksClient.isWorkspaceNameAvailable.mockResolvedValue(false);
      const response = await request(app).get('/ws-validate/existing-workspace');
      expect(response.status).toEqual(400);
      expect(response.body).toEqual({ error: 'Workspace name already exists' });
      expect(databricksClient.isWorkspaceNameAvailable).toHaveBeenCalledWith('existing-workspace');
    });

    it('should return 500 if DatabricksClient.isWorkspaceNameAvailable throws an error', async () => {
      const errorMessage = 'Validation failed due to internal error';
      databricksClient.isWorkspaceNameAvailable.mockRejectedValue(new Error(errorMessage));
      const errorSpy = jest.spyOn(logger, 'error');

      const response = await request(app).get('/ws-validate/any-name');
      expect(response.status).toEqual(500);
      expect(response.body).toEqual({
        error: errorMessage,
      });
      expect(databricksClient.isWorkspaceNameAvailable).toHaveBeenCalledWith('any-name');
      expect(errorSpy).toHaveBeenCalledWith(
        'Failed to validate workspace name "any-name"',
        expect.any(Error),
      );
    });
  });

  describe('GET /workspaces', () => {
    it('should return a list of workspace names', async () => {
      databricksClient.listWorkspaceNamesCached.mockResolvedValue(['ws1', 'ws2', 'ws3']);
      const response = await request(app).get('/workspaces');
      expect(response.status).toEqual(200);
      expect(response.body).toEqual({ names: ['ws1', 'ws2', 'ws3'] });
      expect(databricksClient.listWorkspaceNamesCached).toHaveBeenCalledTimes(1);
    });

    it('should return 500 if DatabricksClient.listWorkspaceNamesCached throws an error', async () => {
      const errorMessage = 'Failed to fetch workspaces from Databricks';
      databricksClient.listWorkspaceNamesCached.mockRejectedValue(new Error(errorMessage));
      const errorSpy = jest.spyOn(logger, 'error');

      const response = await request(app).get('/workspaces');
      expect(response.status).toEqual(500);
      expect(response.text).toContain(errorMessage);
      expect(databricksClient.listWorkspaceNamesCached).toHaveBeenCalledTimes(1);
      expect(errorSpy).toHaveBeenCalledWith('Failed to list workspace names', expect.any(Error));
    });
  });
});
