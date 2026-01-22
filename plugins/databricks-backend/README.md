# Databricks Backend Plugin

This backend plugin for Backstage provides integration with Databricks. Its primary purpose is to expose Databricks functionalities through a secure API for your Backstage instance to consume.

The plugin currently supports:
*   Listing all workspaces within a Databricks account.
*   Validating the availability of a new workspace name.

## Configuration

To use this plugin, you must configure it in your `app-config.yaml`. This involves setting up an OAuth client for service-to-service authentication with the Databricks account-level API.

```yaml
# app-config.yaml
databricks:
  clientId: ${DATABRICKS_CLIENT_ID}
  clientSecret: ${DATABRICKS_CLIENT_SECRET}
  # The {ACCOUNT_ID} is your Databricks account ID
  tokenEndpointUrl: "https://accounts.gcp.databricks.com/oidc/accounts/{ACCOUNT_ID}/v1/token"
  accountLevelRestApi: "https://accounts.gcp.databricks.com/api/2.0/accounts/{ACCOUNT_ID}"
```

**Note:** The `clientId` and `clientSecret` should be sourced from environment variables or another secrets management system.

## Installation

This plugin is installed via the `@internal/plugin-databricks-backend` package. To install it to your backend package, run the following command:

```bash
# From your root directory
yarn --cwd packages/backend add @internal/plugin-databricks-backend
```

```ts
import { createBackend } from '@backstage/backend-defaults';

const backend = createBackend();
backend.add(import('@internal/plugin-databricks-backend'));
backend.start();
```
## API Documentation

The following API endpoints are provided by the plugin.

### GET `/api/databricks/workspaces`

Returns a JSON array of all workspace names available in the configured atabricks account.

**Example Response:**
```json
[
  "production-workspace",
  "staging-workspace"
]
```

### GET `/api/databricks/workspaces/:workspaceName/validate`

Checks if a given workspace name is already in use. The comparison is case-insensitive.

*   **`200 OK`**: The name is available.
*   **`409 Conflict`**: The name is already taken.
*   **`400 Bad Request`**: The `workspaceName` parameter is missing or empty.


## Development

This plugin backend can be started in a standalone mode from directly in this
package with `yarn start`. It is a limited setup that is most convenient when
developing the plugin backend itself.

If you want to run the entire project, including the frontend, run `yarn start` from the root directory.
