import { ConfigReader } from '@backstage/config';
import { getVoidLogger } from '@backstage/backend-common';
import fetch from 'node-fetch';
import { DatabricksClient } from './DatabricksClient';

jest.mock('node-fetch', () => ({
  __esModule: true,
  default: jest.fn(),
}));

const mockedFetch = fetch as unknown as jest.Mock;

type MockResponseOptions = {
  ok?: boolean;
  status?: number;
  text?: string;
  json?: any;
  jsonThrows?: boolean;
};

function makeResponse(opts: MockResponseOptions) {
  const ok = opts.ok ?? true;
  const status = opts.status ?? 200;

  return {
    ok,
    status,
    text: async () =>
      opts.text ??
      (typeof opts.json === 'string'
        ? opts.json
        : JSON.stringify(opts.json ?? '')),
    json: async () => {
      if (opts.jsonThrows) {
        throw new Error('Invalid JSON');
      }
      return opts.json;
    },
  } as any;
}

describe('DatabricksClient', () => {
  let client: DatabricksClient;
  const mockBaseUrl = 'https://mock.databricks.com';
  const mockAccountId = 'test-account-id';
  const mockClientId = 'test-client-id';
  const mockClientSecret = 'test-client-secret';
  const mockLogger = getVoidLogger();

  beforeEach(() => {
    mockedFetch.mockReset();
    client = new DatabricksClient({
      baseUrl: mockBaseUrl,
      accountId: mockAccountId,
      clientId: mockClientId,
      clientSecret: mockClientSecret,
      logger: mockLogger,
      tokenTtlMs: 100, // short TTL for tests
      workspaceTtlMs: 100, // short TTL for tests
    });
  });

  describe('fromConfig', () => {
    it('should create a DatabricksClient instance from Config', () => {
      const config = new ConfigReader({
        databricks: {
          baseUrl: mockBaseUrl,
          accountId: mockAccountId,
          clientId: mockClientId,
          clientSecret: mockClientSecret,
        },
      });

      const clientFromConfig = DatabricksClient.fromConfig({
        config,
        logger: mockLogger,
      });

      expect(clientFromConfig).toBeInstanceOf(DatabricksClient);
      // @ts-ignore - accessing private props for test validation
      expect(clientFromConfig.baseUrl).toBe(mockBaseUrl);
      // @ts-ignore
      expect(clientFromConfig.accountId).toBe(mockAccountId);
      // @ts-ignore
      expect(clientFromConfig.clientId).toBe(mockClientId);
      // @ts-ignore
      expect(clientFromConfig.clientSecret).toBe(mockClientSecret);
    });
  });

  describe('getAccessToken', () => {
    it('should fetch and cache a new access token', async () => {
      const mockAccessToken = 'new-access-token';

      mockedFetch.mockResolvedValueOnce(
        makeResponse({
          ok: true,
          status: 200,
          json: { access_token: mockAccessToken },
        }),
      );

      const token = await client.getAccessToken();

      expect(token).toBe(mockAccessToken);
      expect(mockedFetch).toHaveBeenCalledTimes(1);
      expect(mockedFetch).toHaveBeenCalledWith(
        `${mockBaseUrl}/oidc/accounts/${mockAccountId}/v1/token`,
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: expect.stringContaining('grant_type=client_credentials'),
        }),
      );
      // @ts-ignore
      expect(client.tokenCache.token).toBe(mockAccessToken);
      // @ts-ignore
      expect(client.tokenCache.expiresAtMs).toBeGreaterThan(Date.now());
    });

    it('should return cached token if not expired', async () => {
      const mockAccessToken = 'cached-access-token';
      // @ts-ignore
      client.tokenCache = {
        token: mockAccessToken,
        expiresAtMs: Date.now() + 10_000,
      };

      const token = await client.getAccessToken();

      expect(token).toBe(mockAccessToken);
      expect(mockedFetch).not.toHaveBeenCalled();
    });

    it('should throw an error if token API call fails', async () => {
      mockedFetch.mockResolvedValueOnce(
        makeResponse({ ok: false, status: 500, text: 'Internal Server Error' }),
      );

      await expect(client.getAccessToken()).rejects.toThrow(
        'Databricks token error: 500',
      );
      expect(mockedFetch).toHaveBeenCalledTimes(1);
    });

    it('should throw an error if token response is invalid JSON', async () => {
      mockedFetch.mockResolvedValueOnce(
        makeResponse({
          ok: true,
          status: 200,
          jsonThrows: true,
          text: '<html>Invalid JSON</html>',
        }),
      );

      await expect(client.getAccessToken()).rejects.toThrow(
        'Failed to parse Databricks token response',
      );
      expect(mockedFetch).toHaveBeenCalledTimes(1);
    });

    it('should throw an error if access_token is missing from response', async () => {
      mockedFetch.mockResolvedValueOnce(
        makeResponse({ ok: true, status: 200, json: { other_field: 'value' } }),
      );

      await expect(client.getAccessToken()).rejects.toThrow(
        'Failed to parse Databricks token response',
      );
      expect(mockedFetch).toHaveBeenCalledTimes(1);
    });
  });

  describe('listWorkspaceNamesCached', () => {
    it('should fetch and cache new workspace names', async () => {
      const mockAccessToken = 'mock-token';
      const mockWorkspaces = [
        { workspace_id: 1, workspace_name: 'workspace-a' },
        { workspace_id: 2, workspace_name: 'workspace-b' },
      ];

      mockedFetch
        .mockResolvedValueOnce(
          makeResponse({
            ok: true,
            status: 200,
            json: { access_token: mockAccessToken },
          }),
        )
        .mockResolvedValueOnce(
          makeResponse({ ok: true, status: 200, json: mockWorkspaces }),
        );

      const names = await client.listWorkspaceNamesCached();

      expect(names).toEqual(['workspace-a', 'workspace-b']);
      expect(mockedFetch).toHaveBeenCalledTimes(2);

      expect(mockedFetch).toHaveBeenNthCalledWith(
        2,
        `${mockBaseUrl}/api/2.0/accounts/${mockAccountId}/workspaces`,
        expect.objectContaining({
          headers: { Authorization: `Bearer ${mockAccessToken}` },
        }),
      );

      // @ts-ignore
      expect(client.workspaceNamesCache.names).toEqual([
        'workspace-a',
        'workspace-b',
      ]);
      // @ts-ignore
      expect(client.workspaceNamesCache.expiresAtMs).toBeGreaterThan(
        Date.now(),
      );
    });

    it('should return cached workspace names if not expired', async () => {
      const mockCachedNames = ['cached-ws-a', 'cached-ws-b'];
      // @ts-ignore
      client.workspaceNamesCache = {
        names: mockCachedNames,
        expiresAtMs: Date.now() + 10_000,
      };

      const names = await client.listWorkspaceNamesCached();

      expect(names).toEqual(mockCachedNames);
      expect(mockedFetch).not.toHaveBeenCalled();
    });

    it('should throw an error if workspace API call fails', async () => {
      mockedFetch
        .mockResolvedValueOnce(
          makeResponse({
            ok: true,
            status: 200,
            json: { access_token: 'mock-token' },
          }),
        )
        .mockResolvedValueOnce(
          makeResponse({
            ok: false,
            status: 500,
            text: 'Internal Server Error',
          }),
        );

      await expect(client.listWorkspaceNamesCached()).rejects.toThrow(
        'Databricks workspace error: 500',
      );
      expect(mockedFetch).toHaveBeenCalledTimes(2);
    });

    it('should throw an error if workspace response is not an array', async () => {
      mockedFetch
        .mockResolvedValueOnce(
          makeResponse({
            ok: true,
            status: 200,
            json: { access_token: 'mock-token' },
          }),
        )
        .mockResolvedValueOnce(
          makeResponse({
            ok: true,
            status: 200,
            json: { data: 'not-an-array' },
          }),
        );

      await expect(client.listWorkspaceNamesCached()).rejects.toThrow(
        'Failed to parse Databricks workspaces response',
      );
      expect(mockedFetch).toHaveBeenCalledTimes(2);
    });
  });

  describe('isWorkspaceNameAvailable', () => {
    const mockWorkspaces = [
      { workspace_id: 1, workspace_name: 'existing-workspace' },
      { workspace_id: 2, workspace_name: 'another-one' },
    ];

    function primeTokenAndWorkspaceMocks() {
      mockedFetch
        .mockResolvedValueOnce(
          makeResponse({
            ok: true,
            status: 200,
            json: { access_token: 'mock-token' },
          }),
        )
        .mockResolvedValueOnce(
          makeResponse({ ok: true, status: 200, json: mockWorkspaces }),
        );
    }

    it('should return true if the workspace name is available', async () => {
      primeTokenAndWorkspaceMocks();
      const available = await client.isWorkspaceNameAvailable('new-workspace');
      expect(available).toBe(true);
    });

    it('should return false if the workspace name is not available (case-insensitive)', async () => {
      primeTokenAndWorkspaceMocks();
      const available = await client.isWorkspaceNameAvailable(
        'Existing-Workspace',
      );
      expect(available).toBe(false);
    });

    it('should throw an error for an empty workspace name', async () => {
      await expect(client.isWorkspaceNameAvailable('')).rejects.toThrow(
        'Workspace name cannot be empty',
      );
      expect(mockedFetch).not.toHaveBeenCalled();
    });

    it('should throw an error for a workspace name shorter than 3 characters', async () => {
      await expect(client.isWorkspaceNameAvailable('ab')).rejects.toThrow(
        'Workspace name must be between 3 and 64 characters.',
      );
      expect(mockedFetch).not.toHaveBeenCalled();
    });

    it('should throw an error for a workspace name longer than 64 characters', async () => {
      const longName = 'a'.repeat(65);
      await expect(client.isWorkspaceNameAvailable(longName)).rejects.toThrow(
        'Workspace name must be between 3 and 64 characters.',
      );
      expect(mockedFetch).not.toHaveBeenCalled();
    });

    it('should throw an error for a workspace name starting with a hyphen', async () => {
      await expect(client.isWorkspaceNameAvailable('-invalid')).rejects.toThrow(
        'Workspace name cannot start or end with a hyphen.',
      );
      expect(mockedFetch).not.toHaveBeenCalled();
    });

    it('should throw an error for a workspace name ending with a hyphen', async () => {
      await expect(client.isWorkspaceNameAvailable('invalid-')).rejects.toThrow(
        'Workspace name cannot start or end with a hyphen.',
      );
      expect(mockedFetch).not.toHaveBeenCalled();
    });

    it('should throw an error for a workspace name with invalid characters', async () => {
      await expect(
        client.isWorkspaceNameAvailable('invalid!name'),
      ).rejects.toThrow(
        'Workspace name can only contain letters, numbers, and hyphens.',
      );
      expect(mockedFetch).not.toHaveBeenCalled();
    });

    it('should allow valid workspace names with numbers and hyphens', async () => {
      primeTokenAndWorkspaceMocks();
      const available = await client.isWorkspaceNameAvailable('valid-name-123');
      expect(available).toBe(true);
    });
  });
});
