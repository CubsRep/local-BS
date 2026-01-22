
import fetch from 'node-fetch';
import { Config } from '@backstage/config';
import { LoggerService } from '@backstage/backend-plugin-api';

type TokenCache = { token: string | null; expiresAtMs: number };

type Workspace = {
    workspace_id: number;
    workspace_name: string;
};

export type DatabricksClientFromConfigOptions = {
    config: Config;
    logger: LoggerService;
    tokenTtlMs?: number; //default 50 min
    workspaceTtlMs?: number; //default 2 mins
};

export class DatabricksClient {
    static fromConfig(options: DatabricksClientFromConfigOptions): DatabricksClient {
        const { config, logger, tokenTtlMs, workspaceTtlMs } = options;

        return new DatabricksClient({
            baseUrl: config.getString('databricks.baseUrl'),
            accountId: config.getString('databricks.accountId'),
            clientId: config.getString('databricks.clientId'),
            clientSecret: config.getString('databricks.clientSecret'),
            logger,
            tokenTtlMs,
            workspaceTtlMs,
        });
    }

    private readonly baseUrl: string;
    private readonly accountId: string;
    private readonly clientId: string;
    private readonly clientSecret: string;
    private readonly logger: LoggerService;

    private readonly tokenTtlMs: number;
    private readonly workspaceTtlMs: number;

    private tokenCache: TokenCache = { token: null, expiresAtMs: 0 };
    private workspaceNamesCache: { names: string[]; expiresAtMs: number } = {
        names: [],
        expiresAtMs: 0,
    };

    constructor(options: {
        baseUrl: string;
        accountId: string;
        clientId: string;
        clientSecret: string;
        logger: LoggerService;
        tokenTtlMs?: number;
        workspaceTtlMs?: number;
    }) {
        this.baseUrl = options.baseUrl;
        this.accountId = options.accountId;
        this.clientId = options.clientId;
        this.clientSecret = options.clientSecret;
        this.logger = options.logger;

        this.tokenTtlMs = options.tokenTtlMs ?? 50 * 60 * 1000; // 50 min
        this.workspaceTtlMs = options.workspaceTtlMs ?? 2 * 60 * 1000; // 2 mins
    }

    private get tokenUrl(): string {
        return `${this.baseUrl}/oidc/accounts/${this.accountId}/v1/token`;
    }

    private get workspaceUrl(): string {
        return `${this.baseUrl}/api/2.0/accounts/${this.accountId}/workspaces`;
    }

    private validateWorkspaceName(name: string): void {
        if (!name) {
            throw new Error('Workspace name cannot be empty.');
        }
        if (name.length < 3 || name.length > 64) {
            throw new Error('Workspace name must be between 3 and 64 characters.');
        }
        if (name.startsWith('-') || name.endsWith('-')) {
            throw new Error('Workspace name cannot start or end with a hyphen.');
        }
        if (!/^[a-zA-Z0-9-]+$/.test(name)) {
            throw new Error('Workspace name can only contain letters, numbers, and hyphens.');
        }
    }

    // Databricks Token
    async getAccessToken(): Promise<string> {
        const now = Date.now();
        if (this.tokenCache.token && this.tokenCache.expiresAtMs > now) {
            this.logger.debug('Databrciks token cache hit');
            return this.tokenCache.token;
        }

        this.logger.debug('Databricks tocken cache miss, fetching new token');

        const body = new URLSearchParams({
            grant_type: 'client_credentials',
            scope: 'all-apis',
            client_id: this.clientId,
            client_secret: this.clientSecret
        })
        const res = await fetch(this.tokenUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: body.toString(),
        });

        if (!res.ok) {
            const error = await res.text();
            this.logger.error(`Databricks token error: ${res.status} ${error}`);
            throw new Error(`Databricks token error: ${res.status}`);
        }
        let json: any;
        try {
            json = await res.json();
        } catch (e) {
            this.logger.error('Failed to parse Databricks token response', { error: String(e) });
            throw new Error('Failed to parse Databricks token response');
        }
        if (!json || typeof (json as { access_token: string }).access_token !== 'string') {
            this.logger.error('Failed to parse Databricks token response', { body: JSON.stringify(json) });
            throw new Error('Failed to parse Databricks token response');
        }

        const accessToken = (json as { access_token: string }).access_token;

        this.tokenCache = {
            token: accessToken,
            expiresAtMs: now + this.tokenTtlMs,
        };
        return accessToken;
    }

    // Databricks WorkspaceNames
    async listWorkspaceNamesCached(): Promise<string[]> {
        const now = Date.now();
        if (this.workspaceNamesCache.expiresAtMs > now) {
            this.logger.debug('Databricks workspace cache hit');
            return this.workspaceNamesCache.names;
        }
        this.logger.debug('Databricks workspace cache miss, fetching new names');

        const token = await this.getAccessToken();
        const res = await fetch(this.workspaceUrl, {
            headers: { Authorization: `Bearer ${token}` },
        });

        if (!res.ok) {
            const error = await res.text();
            this.logger.error(`Databricks workspace error: ${res.status} ${error}`);
            throw new Error(`Databricks workspace error: ${res.status}`);
        }

        const json = await res.json();

        if (!Array.isArray(json)) {
            this.logger.error('Failed to parse Databricks workspaces response', { body: json });
            throw new Error('Failed to parse Databricks workspaces response');
        }

        const names = (json as Workspace[])
            .map(ws => ws.workspace_name)
            .filter((n: string) => Boolean(n));

        this.workspaceNamesCache = {
            names,
            expiresAtMs: now + this.workspaceTtlMs,
        };
        return names;
    }


    // Workspace Availability
    async isWorkspaceNameAvailable(name: string): Promise<boolean> {
        const trimmed = name.trim();
        this.validateWorkspaceName(trimmed);

        const names = await this.listWorkspaceNamesCached();
        const exists = names.some(n => n.toLowerCase() === trimmed.toLowerCase());
        return !exists
    }
};
