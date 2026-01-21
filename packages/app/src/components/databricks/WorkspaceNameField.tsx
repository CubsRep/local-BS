import { useState, useEffect, useMemo, useRef } from 'react';
import { useDebounce } from 'react-use';
import {
    TextField,
    CircularProgress,
    InputAdornment,
    makeStyles,
} from '@material-ui/core';
import {
    FieldExtensionComponentProps,
} from '@backstage/plugin-scaffolder-react';
import type { ApiHolder } from '@backstage/core-plugin-api';
import type { FieldValidation, } from '@rjsf/utils';
import {
    discoveryApiRef,
    fetchApiRef,
    FetchApi,
    useApi,
} from '@backstage/core-plugin-api';
 
/**
 * The validation status of the workspace name.
 * - idle: No validation has been performed.
 * - checking: Validation is in progress.
 * - available: The name is available.
 * - unavailable: The name is not available.
 * - error: An error occurred during validation.
 */
type Status = 'idle' | 'checking' | 'available' | 'unavailable' | 'error';
 
/**
 * Converts a string to kebab-case string.
 * This includes trimming, normalizing, convert to lower case and replacing invalid characters.
 * @param s The input string.
 */
const kebabize = (s: string) =>
    (s ?? '')
        .trim()
        .replace(/[^a-zA-Z0-9]+/g, '-') // Replace non-alphanumeric with a hyphen
        .replace(/-+/g, '-') // Replace multiple hyphens with a single one
        .replace(/^-+|-+$/g, '') // Remove leading/trailing hyphens
        .toLowerCase();
 
/**
 * Gets the first character of a domain string, in lowercase.
 * @param d The domain string.
 */
const domainChar = (d?: string) => (d ? d[0].toLowerCase() : '');
 
/**
 * Constructs the final workspace name from its constituent parts.
 * @param base The user-provided base name for the workspace.
 * @param drn The DRN value from the form.
 * @param domain The domain value from the form.
 * @returns The final constructed workspace name, or an empty string if inputs are missing.
 */
const buildFinalName = (base: string, drn?: string, domain?: string) => {
    const b = kebabize(base);
    const d = (drn ?? '').trim();
    const dc = domainChar(domain);
    if (!b || !d || !dc) return '';
    return `${b}-${d}${dc}`;
};
 
// --- Shared request deduplication ---
 
/**
 * A simple in-memory cache to deduplicate availability checks for the same name.
 * This prevents firing off multiple requests for the same name if the user types
 * and then immediately clicks "Next".
 */
const availabilityCache = new Map<string, { ts: number; promise: Promise<boolean> }>();
const CACHE_TTL_MS = 5000;
 
/**
 * A shared, cached function to check workspace name availability against the backend.
 * @param args - The arguments for the availability check.
 * @param args.baseUrl - The base URL of the databricks-backend.
 * @param args.finalName - The fully constructed workspace name to validate.
 * @param args.fetchApi - The fetch API from Backstage.
 * @param args.signal - An AbortSignal to cancel the request.
 * @returns A promise that resolves to `true` if the name is available, `false` otherwise.
 */
async function getAvailabilityByName(args: {
    baseUrl: string;
    finalName: string;
    fetchApi: FetchApi;
    signal?: AbortSignal;
}): Promise<boolean> {
    const { baseUrl, finalName, fetchApi, signal } = args;
    const now = Date.now();
    const cached = availabilityCache.get(finalName);
 
    // Return cached promise if it's still valid.
    if (cached && now - cached.ts < CACHE_TTL_MS) {
        return cached.promise;
    }
 
    const promise = (async () => {
        const resp = await fetchApi.fetch(
            `${baseUrl}/ws-validate/${encodeURIComponent(finalName)}`,
            { method: 'GET', signal },
        );
        // The backend now returns 400 for "unavailable" and 200 for "available".
        if (resp.status === 200) {
            const body = await resp.json();
            return body?.available === true;
        }
        if (resp.status === 400) {
            return false;
        }
        // For other errors (e.g., 500), throw an exception.
        const body = await resp.json();
        throw new Error(body?.error ?? 'Workspace name validation failed');
    })();
 
    availabilityCache.set(finalName, { ts: now, promise });
    return promise;
}
 
const useStyles = makeStyles(theme => ({
    available: {
        color: theme.palette.success.main,
    },
}));
 
/**
 * A custom Scaffolder field extension for entering a Databricks workspace name.
 * It provides live, debounced validation against a backend service.
 *
 * This component performs two types of validation:
 * 1. **Live Validation (UX):** As the user types, it constructs a final name and
 *    checks its availability, showing a status (checking, available, unavailable).
 *    This is for immediate user feedback.
 * 2. **Final Validation (Integrity):** A separate `databricksWorkspaceNameValidation`
 *    function is exported, which is used by the Scaffolder's submit logic. This
 *    ensures data integrity before proceeding.
 *
 * Both validation methods use a shared, cached `getAvailabilityByName` function
 * to avoid redundant API calls.
 */
export const DatabricksWorkspaceNameField = (
    props: FieldExtensionComponentProps<string>,
) => {
    const { formData, onChange, rawErrors, required, schema, uiSchema } = props;
    const [status, setStatus] = useState<Status>('idle');
    const [message, setMessage] = useState('');
    const classes = useStyles();
 
    const discovery = useApi(discoveryApiRef);
    const fetchApi = useApi(fetchApiRef);
 
    // Access the entire form data to get dependent fields.
    const root = (props as any)?.formContext?.formData ?? {};
    const drn = root?.drn as string | undefined;
    const domain = root?.domain as string | undefined;
    const networkType = root?.network_type as string | undefined;
 
    const finalName = useMemo(
        () => buildFinalName(String(formData ?? ''), drn, domain),
        [formData, drn, domain],
    );
 
    const abortRef = useRef<AbortController | null>(null);
 
    // Effect to reset or trigger validation when dependent fields change.
    useEffect(() => {
        abortRef.current?.abort(); // Abort any in-flight request.
        abortRef.current = null;
 
        if (networkType !== 'databricks') {
            setStatus('idle');
            setMessage('');
            return;
        }
 
        if (!finalName) {
            setStatus('idle');
            setMessage('');
            return;
        }
 
        const baseName = String(formData ?? '');
        if (baseName.length < 3) {
            setStatus('idle');
            if (baseName.length > 0) {
                setMessage(`Final name: ${finalName}. (Requires 3+ chars to validate)`);
            } else {
                setMessage(''); // Fallback to description
            }
            return;
        }
 
        // When inputs change, immediately switch to 'checking' state.
        setStatus('checking');
        // The user wants to see the constructed name while typing.
        // The CircularProgress indicator will show that it's "checking".
        setMessage(`The final name is ${finalName}`);
    }, [finalName, networkType, formData]);
 
    // Debounced validation function.
    const validate = async () => {
        if (networkType !== 'databricks' || !finalName || String(formData ?? '').length < 3) return;
 
        abortRef.current?.abort();
        const controller = new AbortController();
        abortRef.current = controller;
 
        try {
            const baseUrl = await discovery.getBaseUrl('databricks');
            const available = await getAvailabilityByName({
                baseUrl,
                finalName,
                fetchApi,
                signal: controller.signal,
            });
 
            if (controller.signal.aborted) return;
 
            if (available) {
                setStatus('available');
                setMessage(`Final name: ${finalName}, and it is available.`);
            } else {
                setStatus('unavailable');
                setMessage(`Final name: ${finalName}, but it already exists. Choose another base name `);
            }
        } catch (e: any) {
            if (e?.name === 'AbortError') return; // Ignore abort errors.
            setStatus('error');
            setMessage(`Error validating '${finalName}': ${e.message ?? 'Failed to validate'}`);
        }
    };
 
    useDebounce(validate, 800, [finalName, networkType]);
 
    const hasError =
        Boolean(rawErrors?.length) ||
        status === 'unavailable' ||
        status === 'error';
 
    const getHelperText = () => {
        // RJSF validation errors take precedence.
        if (rawErrors?.length) {
            return rawErrors[0];
        }
        // If not a databricks network, show an informational message.
        if (networkType !== 'databricks') {
            return 'Validation is only active for network_type "databricks".';
        }
        // Return the dynamic message, or fall back to the template's description.
        return (
            message ||
            uiSchema?.['ui:help'] ||
            schema.description ||
            'Enter a base name to generate the final workspace name.'
        );
    };
 
    const helperText = getHelperText();
 
 
    return (
        <TextField
            fullWidth
            label={schema.title}
            placeholder={uiSchema?.['ui:placeholder']}
            required={required}
            value={formData ?? ''}
            error={hasError}
            helperText={
                <span className={status === 'available' ? classes.available : undefined}>
                    {helperText}
                </span>
            }
            onChange={e => onChange(e.target.value)}
            InputProps={{
                endAdornment: (
                    <InputAdornment position="end">
                        {status === 'checking' && <CircularProgress size={20} />}
                    </InputAdornment>
                ),
            }}
        />
    );
};
 
/**
 * The final, submit-time validation function for the Scaffolder.
 *
 * This function is executed when the user attempts to proceed to the next step,
 * providing a definitive check on the workspace name's validity. It reuses the
 * `getAvailabilityByName` function, which may return a cached result if the live
 * validation in the component just ran.
 */
export const databricksWorkspaceNameValidation = async (
    value: string,
    validation: FieldValidation,
    context: { apiHolder: ApiHolder } & Record<string, any>,
) => {
    const root = context?.formData ?? context?.formContext?.formData ?? {};
    const drn = root?.drn as string | undefined;
    const domain = root?.domain as string | undefined;
    const networkType = root?.network_type as string | undefined;
 
    // Skip validation if not applicable.
    if (networkType !== 'databricks') {
        return;
    }
 
    // Don't block the user if dependent fields are not yet filled.
    if (!value?.trim() || !drn?.trim() || !domain?.trim()) {
        return;
    }
 
    const finalName = buildFinalName(value, drn, domain);
    if (!finalName) {
        validation.addError('Could not construct a valid final workspace name.');
        return;
    }
 
    try {
        const discovery = context.apiHolder.get(discoveryApiRef)!;
        const fetchApi = context.apiHolder.get(fetchApiRef) as FetchApi;
        const baseUrl = await discovery.getBaseUrl('databricks');
 
        const available = await getAvailabilityByName({
            baseUrl,
            finalName,
            fetchApi,
        });
 
        if (!available) {
            validation.addError(`Workspace name '${finalName}' is not available.`);
        }
    } catch (e: any) {
        validation.addError(e?.message ?? 'Backend validation failed.');
    }
};
 
 